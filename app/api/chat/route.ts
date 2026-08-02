/**
 * /api/chat/route.ts — Chat API route
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 14.4, 14.5
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateText, streamText, tool, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { verifyToken } from '@/lib/verify-token'
import { redis, keys } from '@/lib/redis'
import { retrieveChunks } from '@/lib/rag/retrieve'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getMeForLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n'

// ──────────────────────────────────────────
//  Zod schema
// ──────────────────────────────────────────

const RequestSchema = z.object({
  message: z.string().min(1).max(500),
  // Optional + defaulted so existing callers that don't send a locale keep working.
  locale: z.enum(['th', 'en']).optional().default(DEFAULT_LOCALE),
})

// ──────────────────────────────────────────
//  System prompt cache (module-level)
// ──────────────────────────────────────────

// The base prompt file is read from disk and cached exactly once. Per-request
// locale directives are appended on top of the cached base string in
// `getSystemPrompt` below — never cached themselves, so requests for
// different locales can't clobber each other's cached prompt.
let cachedBaseSystemPrompt: string | null = null

function getBaseSystemPrompt(): string {
  if (cachedBaseSystemPrompt === null) {
    // Try multiple paths: inside project first, then parent directory
    const paths = [
      join(process.cwd(), 'prompts/system-prompt-v2.md'),
      join(process.cwd(), '../prompts/system-prompt-v2.md'),
    ]
    for (const p of paths) {
      try {
        cachedBaseSystemPrompt = readFileSync(p, 'utf-8')
        break
      } catch {
        // try next path
      }
    }
    if (cachedBaseSystemPrompt === null) cachedBaseSystemPrompt = ''
  }
  return cachedBaseSystemPrompt
}

// Rich chat block (resume-description / resume-table / resume-chart)
// instructions live in their own file, kept separate from the main persona
// prompt so it stays a manageable size. Same disk-read + module-level cache
// pattern as `getBaseSystemPrompt` above — including the multi-path fallback
// for the Docker image's different cwd — and a missing file falls back to
// `''` rather than throwing, so chat still works if it's absent.
let cachedComponentInstructions: string | null = null

function getComponentInstructions(): string {
  if (cachedComponentInstructions === null) {
    const paths = [
      join(process.cwd(), 'prompts/component-instructions.md'),
      join(process.cwd(), '../prompts/component-instructions.md'),
    ]
    for (const p of paths) {
      try {
        cachedComponentInstructions = readFileSync(p, 'utf-8')
        break
      } catch {
        // try next path
      }
    }
    if (cachedComponentInstructions === null) cachedComponentInstructions = ''
  }
  return cachedComponentInstructions
}

const LOCALE_DIRECTIVE: Record<Locale, string> = {
  en: '\n\nRespond in English regardless of the language of the question.',
  th: '\n\nตอบเป็นภาษาไทยเสมอ ไม่ว่าคำถามจะเป็นภาษาอะไร',
}

export function getSystemPrompt(locale: Locale = DEFAULT_LOCALE): string {
  return getBaseSystemPrompt() + '\n\n' + getComponentInstructions() + LOCALE_DIRECTIVE[locale]
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
//  Agent call options
// ──────────────────────────────────────────

/**
 * Builds the ONE options object handed to the model.
 *
 * Both reply paths use it — `generateText` for the JSON response and
 * `streamText` for the SSE response — so the model, system prompt, retrieval
 * tool and multi-step stop condition cannot drift apart between them.
 */
function buildAgentOptions(opts: {
  systemPrompt: string
  meData: ReturnType<typeof getMeForLocale>
  userMemory: string[]
  message: string
}) {
  const { systemPrompt, meData, userMemory, message } = opts

  // Small, always-needed facts (for greetings + PDF links + "who are you")
  // stay in the prompt — cheap and needed almost every turn. The large,
  // query-dependent material (experience/projects/skills detail) is fetched on
  // demand via searchResume. Teaching point: not everything should be RAG —
  // only the big searchable corpus is; tiny always-needed facts stay inline.
  const alwaysOn = [
    `พื้นฐาน: ${meData.profile.firstNameTH} ${meData.profile.lastNameTH} (${meData.profile.nickname}), ${meData.profile.title}. ${meData.profile.tagline}`,
    `ประสบการณ์รวม ${meData.summary.yearsOfExperience}+ ปี. ${meData.summary.bio}`,
    `ติดต่อ: ${meData.contact.email}, ${meData.contact.phone}. ลิงก์เรซูเม่ PDF: ${meData.cta.resumePdfUrl}`,
  ].join('\n')

  // userMemory = topics already asked this session. Empty ⇒ new session ⇒ the
  // system prompt's greeting behavior kicks in. Preserved from the n8n design.
  const memoryContext = userMemory.length
    ? `[หัวข้อที่ผู้ใช้เคยถามในเซสชันนี้]: ${userMemory.join(', ')}`
    : `[เซสชันใหม่ — ยังไม่มีหัวข้อที่เคยถาม ให้แนะนำตัวตามที่ระบบกำหนด]`

  // Explicit provider (reads the key Next loads from .env.local). gemini-2.5-flash
  // supports tool calling and is fast enough for an interactive chat.
  const model = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })('gemini-flash-latest')

  return {
    model,
    system: `${systemPrompt}\n\n[ข้อมูลที่มีอยู่เสมอ]\n${alwaysOn}\n\n${memoryContext}`,
    prompt: message,
    tools: {
      searchResume: tool({
        description:
          'ค้นหาข้อมูลเชิงลึกใน resume ของปกร — ประสบการณ์ทำงาน โปรเจกต์ ทักษะ การศึกษา. เรียกใช้เมื่อผู้ใช้ถามรายละเอียดที่ไม่มีในข้อมูลพื้นฐาน.',
        inputSchema: z.object({
          query: z
            .string()
            .describe('คำค้นภาษาไทยหรืออังกฤษ เช่น "ประสบการณ์ CRM", "โปรเจกต์ Next.js", "ทักษะ DevOps"'),
        }),
        execute: async ({ query }) => {
          const chunks = await retrieveChunks(query, 5)
          return chunks.map((c) => ({ title: c.title, content: c.content }))
        },
      }),
    },
    // Let the model call the tool, read the retrieved chunks, then compose the
    // final answer. Without a multi-step stop condition, the call would halt
    // right after the first tool call and never produce the reply text.
    stopWhen: stepCountIs(5),
  }
}

// ──────────────────────────────────────────
//  Turn persistence (shared by both reply paths)
// ──────────────────────────────────────────

/**
 * Writes the finished turn to Redis: keyword memory first, then the bounded
 * history list. Extracted so the streaming path stores exactly what the
 * non-streaming path stores.
 */
async function persistTurn(opts: {
  message: string
  reply: string
  memoryKey: string
  userMemory: string[]
  historyKey: string
}): Promise<void> {
  const { message, reply, memoryKey, userMemory, historyKey } = opts

  // Memory: the agent doesn't emit a userMemory array (unlike the old n8n
  // contract), so we always fall back to keyword auto-extraction from the
  // user's message — the same KEYWORD_MAP path used before.
  const keyword = extractKeyword(message)
  if (keyword && !userMemory.includes(keyword)) {
    const updatedMemory = [...userMemory, keyword].slice(-20)
    await redis.set(memoryKey, JSON.stringify(updatedMemory), 'EX', 604800)
  }

  // History (max 20, TTL 24h — matches session TTL)
  const userMsg = JSON.stringify({ role: 'user', content: message, timestamp: Date.now() })
  const aiMsg = JSON.stringify({ role: 'assistant', content: reply, timestamp: Date.now() })

  await redis.rpush(historyKey, userMsg, aiMsg)
  await redis.ltrim(historyKey, -20, -1)
  await redis.expire(historyKey, 86400)
}

// ──────────────────────────────────────────
//  SSE streaming reply
// ──────────────────────────────────────────

const encoder = new TextEncoder()

/**
 * Serialises one SSE frame. The payload is JSON-encoded, which is what makes
 * streaming Markdown safe: `JSON.stringify` escapes the newlines that would
 * otherwise terminate the frame in the middle of a reply.
 */
function sseFrame(event: 'chunk' | 'done' | 'error', data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

/**
 * Streams the agent's reply as `text/event-stream`.
 *
 * Auth, rate limiting and validation all run BEFORE this is called, because
 * once the first byte is written the status code is committed to 200 and can no
 * longer be changed (see `next/dist/docs/01-app/02-guides/streaming.md` →
 * "The HTTP contract"). Failures after that point are reported as an `error`
 * event inside the stream instead.
 *
 * A bare Web `Response` is used rather than `NextResponse` — the latter does
 * not carry a streaming body.
 */
function streamReply(opts: {
  agentOptions: ReturnType<typeof buildAgentOptions>
  message: string
  memoryKey: string
  userMemory: string[]
  historyKey: string
  cors: Record<string, string>
  signal: AbortSignal
}): Response {
  const { agentOptions, message, memoryKey, userMemory, historyKey, cors, signal } = opts

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = ''
      let closed = false

      const send = (event: 'chunk' | 'done' | 'error', data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(sseFrame(event, data))
        } catch {
          // Client went away between the check and the enqueue.
          closed = true
        }
      }

      // Flush headers immediately. The first text delta can be several seconds
      // out (the model calls searchResume, which embeds + queries pgvector
      // first), and an idle connection can be dropped by an intermediary.
      try {
        controller.enqueue(encoder.encode(': open\n\n'))
      } catch {
        closed = true
      }

      try {
        const result = streamText({ ...agentOptions, abortSignal: signal })

        // textStream yields only the text deltas, across every step — the tool
        // round-trip happens transparently before the first delta appears.
        for await (const delta of result.textStream) {
          full += delta
          send('chunk', { text: delta })
        }

        await persistTurn({ message, reply: full, memoryKey, userMemory, historyKey })
        send('done', { text: full })
      } catch (error) {
        console.error(error)
        // Persist whatever was produced so the saved history matches what the
        // visitor actually saw (including a reply cut short by Stop/navigation).
        if (full) {
          try {
            await persistTurn({ message, reply: full, memoryKey, userMemory, historyKey })
          } catch (persistError) {
            console.error(persistError)
          }
        }
        // On an abort the client is already gone; an error frame would only be
        // written into a dead socket.
        if (!signal.aborted) send('error', { error: 'Service unavailable' })
      } finally {
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed by a client disconnect.
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream',
      // `no-transform` is not decoration: Next's own gzip layer
      // (next/dist/compiled/compression) skips any response whose Cache-Control
      // carries it. Without it the deltas sit in zlib's buffer and the reply
      // still lands in one lump — the exact problem this endpoint exists to fix.
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // critical for nginx/Cloudflare
    },
  })
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

  // 1b. Confirm an active session exists in Redis for this visitor
  const sessionExists = await redis.exists(keys.session(visitorId))
  if (!sessionExists) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })
  }

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

  const { message, locale } = parsed.data
  const meData = getMeForLocale(locale)

  // 3. Rate limit check (keyed by IP + visitorId to resist cookie-swap evasion)
  const rateLimitKey = keys.rateLimit(visitorId, ip)
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

  // 4b. Chat session ID — per browser tab/window (separates incognito from normal)
  const chatSessionId = req.headers.get('x-chat-session') ?? 'default'

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

  // 6. Get system prompt (base cached, locale directive appended per-request)
  const systemPrompt = getSystemPrompt(locale)
  console.log({ instructionsLength: systemPrompt.length, hasInstructions: systemPrompt.length > 0 })

  // 7. Build the RAG tool-calling agent call (Vercel AI SDK).
  //    Replaces the old "POST the entire ME object to n8n" design. The model no
  //    longer receives the whole resume up front — it RETRIEVES only the chunks
  //    it needs via the searchResume tool. This is the agent + RAG payoff.
  const historyKey = keys.history(visitorId, chatSessionId)
  const agentOptions = buildAgentOptions({ systemPrompt, meData, userMemory, message })

  // 7b. Streaming path — opt-in via `Accept: text/event-stream`. Everything that
  //     can return a real HTTP status (auth, rate limit, validation) has already
  //     run, so it is safe to commit to 200 and start writing the body.
  if ((req.headers.get('accept') ?? '').includes('text/event-stream')) {
    return streamReply({
      agentOptions,
      message,
      memoryKey,
      userMemory,
      historyKey,
      cors,
      signal: req.signal,
    })
  }

  // 7c. Non-streaming path — the original JSON contract, kept for clients that
  //     do not ask for a stream (and as the fallback when a proxy strips SSE).
  let reply: string
  try {
    const result = await generateText(agentOptions)

    reply = result.text
    console.log({
      steps: result.steps.length,
      toolCalls: result.steps.flatMap((s) => s.toolCalls).map((t) => t.toolName),
      extractedReply: reply.slice(0, 100),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: cors })
  }

  // 8. Save memory + history (max 20, TTL 24h — matches session TTL)
  await persistTurn({ message, reply, memoryKey, userMemory, historyKey })

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

  // Confirm an active session exists in Redis for this visitor
  const sessionExists = await redis.exists(keys.session(visitorId))
  if (!sessionExists) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })
  }

  // Chat session ID — per browser tab/window
  const chatSessionId = req.headers.get('x-chat-session') ?? 'default'

  // Fetch history from Redis
  const historyKey = keys.history(visitorId, chatSessionId)
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
      'Access-Control-Allow-Headers': 'Content-Type, x-chat-session',
    },
  })
}
