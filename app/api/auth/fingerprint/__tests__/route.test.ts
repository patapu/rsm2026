/**
 * Tests for /api/auth/fingerprint/route.ts
 * Covers:
 *   Sub-task 3.1 — Property 4: Fingerprint Idempotence (fast-check)
 *   Sub-task 3.2 — Unit tests
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest } from 'next/server'

// ──────────────────────────────────────────
//  Mocks — must be declared before imports
// ──────────────────────────────────────────

vi.mock('@/lib/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    // The route counts mints per IP before it will issue a new token.
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
  keys: {
    session: (id: string) => `session:${id}`,
    memory: (id: string) => `memory:${id}`,
    history: (id: string) => `chat:history:${id}`,
    rateLimit: (id: string) => `ratelimit:${id}`,
    fpMint: (ip: string) => `fp-mint:${ip}`,
    blocked: (ip: string) => `blocked:${ip}`,
  },
}))

vi.mock('@/lib/fingerprint', () => ({
  createVisitorId: vi.fn().mockReturnValue('a'.repeat(64)),
  verifyToken: vi.fn().mockImplementation((token: string) => /^[0-9a-f]{64}$/.test(token)),
}))

// ──────────────────────────────────────────
//  Imports after mocks
// ──────────────────────────────────────────

import { POST } from '../route'
import { redis } from '@/lib/redis'
import { verifyToken } from '@/lib/fingerprint'

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

function makeRequest(body: object, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const req = new NextRequest('http://localhost/api/auth/fingerprint', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  })
  return req
}

/** Same as `makeRequest`, plus arbitrary headers (used for x-forwarded-for). */
function makeRequestWithHeaders(body: object, headers: Record<string, string>) {
  return new NextRequest('http://localhost/api/auth/fingerprint', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const VALID_BODY = { ua: 'Mozilla/5.0', lang: 'th-TH', screenHint: '1920x1080' }
const VALID_TOKEN = 'a'.repeat(64) // matches /^[0-9a-f]{64}$/

// ──────────────────────────────────────────
//  Reset mocks before each test
// ──────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Default: verifyToken returns true for 64-char hex, false otherwise
  vi.mocked(verifyToken).mockImplementation((token: string) => /^[0-9a-f]{64}$/.test(token))
  // Default: first mint of the hour for this IP, and nothing blacklisted.
  vi.mocked(redis.incr).mockResolvedValue(1)
  vi.mocked(redis.expire).mockResolvedValue(1)
  vi.mocked(redis.get).mockResolvedValue(null)
  delete process.env.FP_MINT_LIMIT
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ──────────────────────────────────────────
//  Sub-task 3.1: Property 4 — Fingerprint Idempotence
// ──────────────────────────────────────────

// Feature: resume-website, Property 4: Fingerprint Idempotence
describe('Property 4: Fingerprint Idempotence', () => {
  it(
    'calling POST with a valid fp_token cookie never calls redis.set (session unchanged)',
    async () => {
      // Validates: Requirements 9.5
      await fc.assert(
        fc.asyncProperty(
          // Generate valid 64-char lowercase hex tokens
          fc.stringMatching(/^[0-9a-f]{64}$/),
          async (token) => {
            vi.clearAllMocks()
            // Ensure verifyToken returns true for this token
            vi.mocked(verifyToken).mockReturnValue(true)

            const req = makeRequest(VALID_BODY, { fp_token: token })
            const res = await POST(req)

            // Should return 200 without creating a new session
            expect(res.status).toBe(200)
            // Redis.set must NOT be called — existing session is preserved
            expect(vi.mocked(redis.set)).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 3.2: Unit tests
// ──────────────────────────────────────────

describe('POST /api/auth/fingerprint', () => {
  describe('new visitor (no existing cookie)', () => {
    it('returns 200 with a set-cookie header', async () => {
      // Requirements: 9.2
      const req = makeRequest(VALID_BODY)
      const res = await POST(req)

      expect(res.status).toBe(200)
      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toBeTruthy()
      expect(setCookie).toContain('fp_token=')
    })

    it('cookie is httpOnly', async () => {
      // Requirements: 9.2
      const req = makeRequest(VALID_BODY)
      const res = await POST(req)

      const setCookie = res.headers.get('set-cookie') ?? ''
      expect(setCookie.toLowerCase()).toContain('httponly')
    })

    it('cookie is secure and sameSite=strict in production', async () => {
      // Requirements: 9.2. Both flags are conditional on NODE_ENV: a `secure`
      // cookie is never stored over plain http, which would lock the whole
      // chat out of a local dev session, and `strict` breaks the same-site
      // check across localhost ports. Production is the case the requirement
      // is about, so the test has to say so.
      vi.stubEnv('NODE_ENV', 'production')

      const res = await POST(makeRequest(VALID_BODY))

      const setCookie = (res.headers.get('set-cookie') ?? '').toLowerCase()
      expect(setCookie).toContain('secure')
      expect(setCookie).toContain('samesite=strict')
    })

    it('drops both flags outside production so local dev can hold the cookie', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const res = await POST(makeRequest(VALID_BODY))

      const setCookie = (res.headers.get('set-cookie') ?? '').toLowerCase()
      expect(setCookie).not.toContain('secure')
      expect(setCookie).toContain('samesite=lax')
    })

    it('response body is empty — no token leak', async () => {
      // Requirements: 9.4
      const req = makeRequest(VALID_BODY)
      const res = await POST(req)

      const text = await res.text()
      expect(text).toBe('')
    })

    it('stores session in Redis with 24h TTL', async () => {
      // Requirements: 9.3
      const req = makeRequest(VALID_BODY)
      await POST(req)

      expect(vi.mocked(redis.set)).toHaveBeenCalledOnce()
      const [key, , exFlag, ttl] = vi.mocked(redis.set).mock.calls[0] as unknown as [string, string, string, number]
      expect(key).toBe(`session:${'a'.repeat(64)}`)
      expect(exFlag).toBe('EX')
      expect(ttl).toBe(86400)
    })

    it('stores ip, ua, and createdAt in the session value', async () => {
      // Requirements: 9.3
      const req = makeRequest(VALID_BODY)
      await POST(req)

      const [, value] = vi.mocked(redis.set).mock.calls[0] as unknown as [string, string, string, number]
      const session = JSON.parse(value)
      expect(session).toHaveProperty('ip')
      expect(session).toHaveProperty('ua', VALID_BODY.ua)
      expect(session).toHaveProperty('createdAt')
      expect(typeof session.createdAt).toBe('number')
    })
  })

  describe('existing valid cookie', () => {
    it('returns 200 without creating a new session', async () => {
      // Requirements: 9.5
      vi.mocked(verifyToken).mockReturnValue(true)

      const req = makeRequest(VALID_BODY, { fp_token: VALID_TOKEN })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(vi.mocked(redis.set)).not.toHaveBeenCalled()
    })

    it('does not set a new cookie when token is already valid', async () => {
      // Requirements: 9.5
      vi.mocked(verifyToken).mockReturnValue(true)

      const req = makeRequest(VALID_BODY, { fp_token: VALID_TOKEN })
      const res = await POST(req)

      // No set-cookie header should be present (or it should be empty)
      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toBeNull()
    })
  })

  describe('invalid request body', () => {
    it('returns 400 for missing fields', async () => {
      const req = makeRequest({ ua: 'Mozilla/5.0' }) // missing lang and screenHint
      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 400 for completely empty body', async () => {
      const req = makeRequest({})
      const res = await POST(req)

      expect(res.status).toBe(400)
    })

    it('returns 400 for non-JSON body', async () => {
      const req = new NextRequest('http://localhost/api/auth/fingerprint', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'text/plain' },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })
  })

  // ── IP blacklist ────────────────────────────────────────────────────────
  //
  // Enforced here rather than in middleware, which runs on the Edge Runtime
  // and cannot reach Redis.

  describe('IP blacklist', () => {
    it('returns 403 for a blocked IP before it mints anything', async () => {
      vi.mocked(redis.get).mockImplementation(async (key) => {
        if (key === 'blocked:1.2.3.4') return '1'
        return null
      })

      const req = makeRequestWithHeaders(VALID_BODY, { 'x-forwarded-for': '1.2.3.4' })
      const res = await POST(req)

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Forbidden' })
      expect(redis.set).not.toHaveBeenCalled()
    })
  })

  // ── Mint rate limit ─────────────────────────────────────────────────────

  describe('mint rate limit', () => {
    it('returns 429 once an IP has minted more than the allowed number of tokens', async () => {
      process.env.FP_MINT_LIMIT = '10'
      vi.mocked(redis.incr).mockResolvedValue(11)

      const res = await POST(makeRequest(VALID_BODY))

      expect(res.status).toBe(429)
      expect(redis.set).not.toHaveBeenCalled()
    })

    it('sets the 1-hour window on the first mint from an IP, and only then', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1)
      await POST(makeRequest(VALID_BODY))
      expect(redis.expire).toHaveBeenCalledWith('fp-mint:unknown', 3600)

      vi.mocked(redis.expire).mockClear()
      vi.mocked(redis.incr).mockResolvedValue(2)
      await POST(makeRequest(VALID_BODY))
      expect(redis.expire).not.toHaveBeenCalled()
    })

    it('spends no mint budget on a visitor who already holds a valid token', async () => {
      // The shortcut for a returning visitor runs before the counter, so a
      // browser that reloads all day cannot rate-limit itself out.
      const res = await POST(makeRequest(VALID_BODY, { fp_token: VALID_TOKEN }))

      expect(res.status).toBe(200)
      expect(redis.incr).not.toHaveBeenCalled()
    })
  })
})
