/**
 * /api/chat/route.ts — Chat API route
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 14.4, 14.5
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/lib/verify-token'
import { redis, keys } from '@/lib/redis'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ME } from '@/lib/me'

// ──────────────────────────────────────────
//  Zod schema
// ──────────────────────────────────────────

const RequestSchema = z.object({
  message: z.string().min(1).max(500),
})

// ──────────────────────────────────────────
//  System prompt cache (module-level)
// ──────────────────────────────────────────

let cachedSystemPrompt: string | null = null

export function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    // Try multiple paths: inside project first, then parent directory
    const paths = [
      join(process.cwd(), 'prompts/system-prompt-v2.md'),
      join(process.cwd(), '../prompts/system-prompt-v2.md'),
    ]
    for (const p of paths) {
      try {
        cachedSystemPrompt = readFileSync(p, 'utf-8')
        break
      } catch {
        // try next path
      }
    }
    if (!cachedSystemPrompt) cachedSystemPrompt = ''
  }
  return cachedSystemPrompt
}

// ──────────────────────────────────────────
//  Config
// ──────────────────────────────────────────

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '20', 10)

// ──────────────────────────────────────────
//  Auto-extract memory keyword from user message
// ──────────────────────────────────────────

const KEYWORD_MAP: [RegExp, string][] = [
  [/สวัสดี|หวัดดี|ทักทาย|hello|hi/i, 'greeting'],
  [/แนะนำตัว|ตัวเอง|เป็นใคร|who/i, 'introduction'],
  [/ประสบการณ์|ทำงาน|บริษัท|career|experience|work/i, 'career'],
  [/skill|ทักษะ|เก่ง|ภาษา|framework|tech/i, 'skills'],
  [/ติดต่อ|contact|email|โทร|hire|จ้าง|สมัคร/i, 'contact'],
  [/project|โปรเจค|ผลงาน|portfolio/i, 'projects'],
  [/การศึกษา|เรียน|มหาวิทยาลัย|education/i, 'education'],
  [/react|next\.?js/i, 'react'],
  [/node|backend|api/i, 'backend'],
  [/devops|docker|deploy|ci\/cd/i, 'devops'],
  [/crm|platform/i, 'crm-platform'],
]

function extractKeyword(message: string): string | null {
  for (const [pattern, keyword] of KEYWORD_MAP) {
    if (pattern.test(message)) return keyword
  }
  // Fallback: use first 2 words as keyword
  const words = message.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '').trim().split(/\s+/)
  if (words.length > 0 && words[0].length > 1) {
    return words.slice(0, 2).join('-').toLowerCase().slice(0, 30)
  }
  return null
}

// ──────────────────────────────────────────
//  CORS helpers (read env per-request so tests can override)
// ──────────────────────────────────────────

function getAllowedOrigin(): string {
  return process.env.ALLOWED_ORIGIN ?? '*'
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigin()
  const headers: Record<string, string> = {}
  if (allowed === '*' || origin === allowed) {
    headers['Access-Control-Allow-Origin'] = allowed
  }
  return headers
}

function isOriginAllowed(origin: string | null): boolean {
  const allowed = getAllowedOrigin()
  if (allowed === '*') return true
  if (!origin) return true // no origin header (e.g. server-to-server)
  return origin === allowed
}

// ──────────────────────────────────────────
//  POST /api/chat
// ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  // CORS check — reject if origin doesn't match
  if (!isOriginAllowed(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: cors })
  }

  // 0. IP blacklist check (moved from middleware — Edge Runtime cannot use ioredis)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const isBlocked = await redis.get(keys.blocked(ip))
  if (isBlocked) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: cors })
  }

  // 1. Verify fp_token cookie
  const token = req.cookies.get('fp_token')?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })
  }
  const visitorId = token

  // 2. Validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: cors })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    // Zod v4 uses .issues; fall back to .errors for compatibility
    const issues = parsed.error.issues ?? (parsed.error as unknown as { errors: typeof parsed.error.issues }).errors ?? []
    const firstIssue = issues[0]
    const field = firstIssue?.path[0] ?? 'message'
    return NextResponse.json(
      { error: firstIssue?.message ?? 'Invalid request', field },
      { status: 400, headers: cors },
    )
  }

  const { message } = parsed.data

  // 3. Rate limit check
  const rateLimitKey = keys.rateLimit(visitorId)
  const count = await redis.incr(rateLimitKey)
  if (count === 1) {
    await redis.expire(rateLimitKey, 60) // 1 minute TTL
  }
  if (count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors })
  }

  // 4. Get or create sessionId (1 visitor = 1 session, TTL 24h)
  const sessionKey = keys.session(visitorId)
  let sessionId = await redis.get(sessionKey)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    await redis.set(sessionKey, sessionId, 'EX', 86400) // 24h TTL
  }

  // 5. Get userMemory from Redis
  const memoryKey = keys.memory(visitorId)
  const rawMemory = await redis.get(memoryKey)
  let userMemory: string[] = []
  if (rawMemory) {
    try {
      userMemory = JSON.parse(rawMemory)
    } catch {
      userMemory = []
    }
  }

  // 6. Get system prompt (cached)
  const systemPrompt = getSystemPrompt()
  console.log({ instructionsLength: systemPrompt.length, hasInstructions: systemPrompt.length > 0 })

  // 7. Forward to n8n
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  console.log({
    n8nUrl
  })
  if (!n8nUrl) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: cors })
  }

  let reply: string
  try {
    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.N8N_WEBHOOK_AUTH ?? '',
      },
      body: JSON.stringify({
        sessionId,
        chatInput: {
          userId: visitorId,
          message,
          userMemory,
        },
        instructions: systemPrompt,
        me: {
          profile: ME.profile,
          contact: ME.contact,
          summary: ME.summary,
          skills: ME.skills,
          experience: ME.experience,
          projects: ME.projects,
          education: ME.education,
          hobbies: ME.hobbies,
          cta: ME.cta,
        },
      }),
    })
    console.log({
      n8nRes
    })
    if (!n8nRes.ok) {
      throw new Error(`n8n returned ${n8nRes.status}`)
    }
    const text = await n8nRes.text()
    console.log({ n8nResponseText: text })
    if (!text || text.trim() === '') {
      throw new Error('n8n returned empty response body')
    }
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      // n8n sometimes returns raw text instead of JSON — treat as plain output
      console.warn('n8n returned non-JSON, using raw text as reply')
      data = { output: text.trim() }
    }

    // Extract reply text — handle all possible response shapes
    let outputValue = data.output ?? data.reply ?? ''
    let memoryFromResponse: string[] | null = null

    if (typeof outputValue === 'string') {
      // Handle nested JSON string (model sometimes returns JSON inside output field)
      try {
        const parsed = JSON.parse(outputValue)
        if (parsed && typeof parsed === 'object' && parsed.output) {
          outputValue = parsed.output
          if (parsed.userMemory && Array.isArray(parsed.userMemory)) {
            memoryFromResponse = parsed.userMemory
          }
        }
      } catch {
        // not nested JSON, use as-is
      }
    }

    reply = (outputValue || '') as string
    console.log({ data, extractedReply: reply.slice(0, 100) })

    // Memory management: use model's memory if provided, otherwise auto-generate from message
    if (memoryFromResponse || (data.userMemory && Array.isArray(data.userMemory))) {
      const newMemory = memoryFromResponse ?? (data.userMemory as string[])
      await redis.set(memoryKey, JSON.stringify(newMemory), 'EX', 604800)
    } else {
      // Auto-generate memory keyword from user message (simple approach)
      const keyword = extractKeyword(message)
      if (keyword && !userMemory.includes(keyword)) {
        const updatedMemory = [...userMemory, keyword].slice(-20)
        await redis.set(memoryKey, JSON.stringify(updatedMemory), 'EX', 604800)
      }
    }
  } catch(error) {
    console.error(error)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: cors })
  }

  // 8. Save to history (max 20, TTL 24h — matches session TTL)
  const historyKey = keys.history(visitorId)
  const userMsg = JSON.stringify({ role: 'user', content: message, timestamp: Date.now() })
  const aiMsg = JSON.stringify({ role: 'assistant', content: reply, timestamp: Date.now() })

  await redis.rpush(historyKey, userMsg, aiMsg)
  await redis.ltrim(historyKey, -20, -1)
  await redis.expire(historyKey, 86400) // 24h TTL (same as session)

  // 9. Return reply
  return NextResponse.json({ reply }, { headers: cors })
}

// ──────────────────────────────────────────
//  GET /api/chat — Load chat history from Redis
// ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (!isOriginAllowed(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: cors })
  }

  // Verify fp_token cookie
  const token = req.cookies.get('fp_token')?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })
  }
  const visitorId = token

  // Fetch history from Redis
  const historyKey = keys.history(visitorId)
  const rawMessages = await redis.lrange(historyKey, 0, -1)

  const messages = rawMessages.map((raw) => {
    try {
      const parsed = JSON.parse(raw)
      return { role: parsed.role, content: parsed.content }
    } catch {
      return null
    }
  }).filter(Boolean)

  return NextResponse.json({ messages }, { headers: cors })
}

// ──────────────────────────────────────────
//  OPTIONS /api/chat (CORS preflight)
// ──────────────────────────────────────────

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
