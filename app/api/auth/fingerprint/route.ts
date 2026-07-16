/**
 * /api/auth/fingerprint/route.ts
 * POST: Issue HMAC visitor token → httpOnly cookie
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createVisitorId, verifyToken } from '@/lib/fingerprint'
import { redis, keys } from '@/lib/redis'

// ──────────────────────────────────────────
//  Request schema
// ──────────────────────────────────────────

const RequestSchema = z.object({
  ua: z.string(),
  lang: z.string(),
  screenHint: z.string(),
})

// ──────────────────────────────────────────
//  POST handler
// ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 0. IP blacklist check (moved from middleware — Edge Runtime cannot use ioredis)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const isBlocked = await redis.get(keys.blocked(ip))
  if (isBlocked) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1. Check existing valid cookie — if already authenticated, do nothing (Req 9.5)
  const existingToken = req.cookies.get('fp_token')?.value
  if (existingToken && verifyToken(existingToken)) {
    return new NextResponse(null, { status: 200 })
  }

  // 1b. IP-keyed mint rate limit — placed AFTER the existing-cookie shortcut so
  //     returning visitors with a valid token do not consume mint budget; only
  //     requests that will actually mint a NEW visitorId are counted.
  const mintKey = keys.fpMint(ip)
  const mintCount = await redis.incr(mintKey)
  if (mintCount === 1) {
    await redis.expire(mintKey, 3600) // 1-hour window
  }
  if (mintCount > parseInt(process.env.FP_MINT_LIMIT ?? '10', 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 2. Validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 3. Create visitor ID (Req 9.1)
  const { ua, lang, screenHint } = parsed.data
  const secret = process.env.FINGERPRINT_SECRET
  if (!secret) {
    throw new Error('FINGERPRINT_SECRET environment variable is required')
  }
  const visitorId = createVisitorId(ua, lang, screenHint, secret)

  // 4. Store session in Redis — TTL 24h (Req 9.3)
  await redis.set(
    keys.session(visitorId),
    JSON.stringify({ ip, ua, createdAt: Date.now() }),
    'EX',
    86400,
  )

  // 5. Set httpOnly cookie and return 200 with no body (Req 9.2, 9.4)
  const isProduction = process.env.NODE_ENV === 'production'
  const response = new NextResponse(null, { status: 200 })
  response.cookies.set('fp_token', visitorId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 86400,
    path: '/',
  })
  return response
}
