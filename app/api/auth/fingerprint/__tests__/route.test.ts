/**
 * Tests for /api/auth/fingerprint/route.ts
 * Covers:
 *   Sub-task 3.1 — Property 4: Fingerprint Idempotence (fast-check)
 *   Sub-task 3.2 — Unit tests
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest } from 'next/server'

// ──────────────────────────────────────────
//  Mocks — must be declared before imports
// ──────────────────────────────────────────

vi.mock('@/lib/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
  },
  keys: {
    session: (id: string) => `session:${id}`,
    memory: (id: string) => `memory:${id}`,
    history: (id: string) => `chat:history:${id}`,
    rateLimit: (id: string) => `ratelimit:${id}`,
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

const VALID_BODY = { ua: 'Mozilla/5.0', lang: 'th-TH', screenHint: '1920x1080' }
const VALID_TOKEN = 'a'.repeat(64) // matches /^[0-9a-f]{64}$/

// ──────────────────────────────────────────
//  Reset mocks before each test
// ──────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Default: verifyToken returns true for 64-char hex, false otherwise
  vi.mocked(verifyToken).mockImplementation((token: string) => /^[0-9a-f]{64}$/.test(token))
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

    it('cookie is secure', async () => {
      // Requirements: 9.2
      const req = makeRequest(VALID_BODY)
      const res = await POST(req)

      const setCookie = res.headers.get('set-cookie') ?? ''
      expect(setCookie.toLowerCase()).toContain('secure')
    })

    it('cookie has sameSite=strict', async () => {
      // Requirements: 9.2
      const req = makeRequest(VALID_BODY)
      const res = await POST(req)

      const setCookie = res.headers.get('set-cookie') ?? ''
      expect(setCookie.toLowerCase()).toContain('samesite=strict')
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
})
