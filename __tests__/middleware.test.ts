/**
 * Tests for middleware.ts
 * Covers:
 *   Sub-task 4.1 — Property 5: Pentest Path Blocking (fast-check)
 *   Sub-task 4.2 — Property 6: Pentest UA Blocking (fast-check)
 *   Sub-task 4.3 — Property 7: IP Blacklist Enforcement (fast-check), which
 *                  middleware now only has to stay out of the way of: the
 *                  check lives in the route handlers, not here
 *   Sub-task 4.4 — Property 14: Middleware Check Order Invariant (fast-check)
 *   Sub-task 4.5 — Unit tests for middleware.ts
 * Requirements: 14.1, 14.2, 14.3, 18.1, 18.2, 18.5, 18.8, 18.9, 18.10
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest } from 'next/server'

// ──────────────────────────────────────────
//  Mocks — must be declared before imports
// ──────────────────────────────────────────

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null), // default: not blocked
    set: vi.fn().mockResolvedValue('OK'),
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

import { middleware } from '../middleware'
import { redis } from '@/lib/redis'
import { verifyToken } from '@/lib/fingerprint'

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

function makeRequest(
  path: string,
  options: {
    ua?: string
    ip?: string
    cookies?: Record<string, string>
  } = {},
) {
  const url = `http://localhost${path}`
  const headers: Record<string, string> = {}
  if (options.ua) headers['user-agent'] = options.ua
  if (options.ip) headers['x-forwarded-for'] = options.ip
  if (options.cookies) {
    headers['cookie'] = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }
  return new NextRequest(url, { headers })
}

// Suspicious paths used in property tests
const SUSPICIOUS_PATHS = [
  '/.env',
  '/.git',
  '/wp-admin',
  '/phpinfo',
  '/admin',
  '/etc/passwd',
]

// Pentest UA tool names
const PENTEST_TOOLS = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'dirbuster']

// ──────────────────────────────────────────
//  Reset mocks before each test
// ──────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Default: IP not blocked
  vi.mocked(redis.get).mockResolvedValue(null)
  // Default: verifyToken validates 64-char hex
  vi.mocked(verifyToken).mockImplementation((token: string) => /^[0-9a-f]{64}$/.test(token))
})

// ──────────────────────────────────────────
//  Sub-task 4.1: Property 5 — Pentest Path Blocking
// ──────────────────────────────────────────

// Feature: resume-website, Property 5: Pentest Path Blocking
describe('Property 5: Pentest Path Blocking', () => {
  it(
    'blocks exact suspicious paths with 403',
    async () => {
      // Validates: Requirements 14.1, 18.1, 18.8
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUSPICIOUS_PATHS),
          async (basePath) => {
            const req = makeRequest(basePath)
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'blocks case variations of suspicious paths with 403',
    async () => {
      // Validates: Requirements 18.8
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUSPICIOUS_PATHS),
          async (basePath) => {
            // Randomly uppercase some characters
            const caseVariant = basePath
              .split('')
              .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c))
              .join('')
            const req = makeRequest(caseVariant)
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'blocks URL-encoded variants of suspicious paths with 403',
    async () => {
      // Validates: Requirements 18.8
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUSPICIOUS_PATHS),
          async (basePath) => {
            // URL-encode the path (encode each character)
            const encoded = basePath
              .split('')
              .map((c) => (c === '/' ? '/' : encodeURIComponent(c)))
              .join('')
            const req = makeRequest(encoded)
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'blocks suspicious paths with trailing slash with 403',
    async () => {
      // Validates: Requirements 18.8
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUSPICIOUS_PATHS),
          async (basePath) => {
            const withTrailingSlash = basePath + '/'
            const req = makeRequest(withTrailingSlash)
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 4.2: Property 6 — Pentest UA Blocking
// ──────────────────────────────────────────

// Feature: resume-website, Property 6: Pentest UA Blocking
describe('Property 6: Pentest UA Blocking', () => {
  it(
    'blocks any UA containing a pentest tool name substring (case-insensitive)',
    async () => {
      // Validates: Requirements 14.2, 18.2, 18.9
      await fc.assert(
        fc.asyncProperty(
          // prefix and suffix strings around the pentest tool name
          fc.string({ maxLength: 50 }),
          fc.string({ maxLength: 50 }),
          fc.constantFrom(...PENTEST_TOOLS),
          async (prefix, suffix, toolName) => {
            // Inject the tool name in lowercase
            const ua = `${prefix}${toolName}${suffix}`
            const req = makeRequest('/api/chat', { ua })
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'blocks UA with uppercase pentest tool name substring',
    async () => {
      // Validates: Requirements 18.9
      await fc.assert(
        fc.asyncProperty(
          fc.string({ maxLength: 50 }),
          fc.string({ maxLength: 50 }),
          fc.constantFrom(...PENTEST_TOOLS),
          async (prefix, suffix, toolName) => {
            // Inject the tool name in UPPERCASE
            const ua = `${prefix}${toolName.toUpperCase()}${suffix}`
            const req = makeRequest('/api/chat', { ua })
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'blocks UA with mixed-case pentest tool name substring',
    async () => {
      // Validates: Requirements 18.9
      await fc.assert(
        fc.asyncProperty(
          fc.string({ maxLength: 50 }),
          fc.string({ maxLength: 50 }),
          fc.constantFrom(...PENTEST_TOOLS),
          async (prefix, suffix, toolName) => {
            // Mixed case: alternate upper/lower
            const mixedCase = toolName
              .split('')
              .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
              .join('')
            const ua = `${prefix}${mixedCase}${suffix}`
            const req = makeRequest('/api/chat', { ua })
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 4.3: Property 7 — IP Blacklist Enforcement
// ──────────────────────────────────────────

// Feature: resume-website, Property 7: IP Blacklist Enforcement
//
// The blacklist itself is no longer enforced here. Middleware runs on the Edge
// Runtime, which cannot use ioredis, so the check moved into the Node route
// handlers (see the note at the top of middleware.ts). What is asserted below
// is the half of the contract middleware still owns: it must not reach for
// Redis at all, and it must pass a blocked IP on rather than swallowing it.
// The 403 itself is covered by the route tests, in
// app/api/chat/__tests__/route.test.ts and
// app/api/auth/fingerprint/__tests__/route.test.ts.
describe('Property 7: IP Blacklist Enforcement (enforced in the route handlers)', () => {
  it(
    'never consults Redis, whatever the IP',
    async () => {
      // Validates: Requirements 14.3, 18.5
      await fc.assert(
        fc.asyncProperty(
          fc.ipV4(),
          async (ip) => {
            vi.mocked(redis.get).mockClear()

            const req = makeRequest('/api/chat', {
              ip,
              cookies: { fp_token: 'a'.repeat(64) },
            })
            await middleware(req)

            return vi.mocked(redis.get).mock.calls.length === 0
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'passes a blocked IP through, leaving the 403 to the route handler',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.ipV4(),
          async (ip) => {
            vi.mocked(redis.get).mockImplementation(async (key) => {
              if (key === `blocked:${ip}`) return '1'
              return null
            })

            const req = makeRequest('/api/chat', {
              ip,
              cookies: { fp_token: 'a'.repeat(64) },
            })
            const res = await middleware(req)

            return res.status === 200
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
// ──────────────────────────────────────────
//  Sub-task 4.4: Property 14 — Middleware Check Order Invariant
// ──────────────────────────────────────────

// Feature: resume-website, Property 14: Middleware Check Order Invariant
describe('Property 14: Middleware Check Order Invariant', () => {
  it(
    'pentest path + no fp_token cookie → 403 (not 401), confirming path check precedes cookie check',
    async () => {
      // Validates: Requirements 18.10
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUSPICIOUS_PATHS),
          async (suspiciousPath) => {
            // No cookie provided — if cookie check ran first, we'd get 401
            // But path check must run first → must get 403
            const req = makeRequest(suspiciousPath)
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'pentest UA + no fp_token cookie → 403 (not 401), confirming UA check precedes cookie check',
    async () => {
      // Validates: Requirements 18.10
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...PENTEST_TOOLS),
          async (toolName) => {
            // No cookie provided — if cookie check ran first, we'd get 401
            // But UA check must run first → must get 403
            const req = makeRequest('/api/chat', { ua: `Mozilla/5.0 ${toolName}/1.0` })
            const res = await middleware(req)
            return res.status === 403
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 4.5: Unit tests for middleware.ts
// ──────────────────────────────────────────

describe('middleware unit tests', () => {
  // ── IP Blacklist ──────────────────────────────────────────────────────────

  describe('IP blacklist', () => {
    it('leaves a blocked IP to the route handler instead of blocking it here', async () => {
      // Requirements: 14.3. The Edge Runtime has no ioredis, so middleware
      // cannot know the IP is blocked. It must not pretend otherwise.
      vi.mocked(redis.get).mockResolvedValue('1')

      const req = makeRequest('/api/chat', {
        ip: '1.2.3.4',
        cookies: { fp_token: 'a'.repeat(64) },
      })
      const res = await middleware(req)

      expect(res.status).toBe(200)
      expect(redis.get).not.toHaveBeenCalled()
    })

    it('allows a request from a non-blocked IP', async () => {
      // IP not blocked, normal path, valid cookie
      vi.mocked(redis.get).mockResolvedValue(null)
      vi.mocked(verifyToken).mockReturnValue(true)

      const req = makeRequest('/api/chat', {
        ip: '1.2.3.4',
        cookies: { fp_token: 'a'.repeat(64) },
      })
      const res = await middleware(req)

      expect(res.status).toBe(200)
    })
  })

  // ── Pentest Path ──────────────────────────────────────────────────────────

  describe('pentest path blocking', () => {
    it('blocks /.env with 403', async () => {
      // Requirements: 14.1
      const req = makeRequest('/.env')
      const res = await middleware(req)

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: 'Forbidden' })
    })

    it('blocks /.git with 403', async () => {
      const req = makeRequest('/.git')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /wp-admin with 403', async () => {
      const req = makeRequest('/wp-admin')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /phpinfo with 403', async () => {
      const req = makeRequest('/phpinfo')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /admin with 403', async () => {
      const req = makeRequest('/admin')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /etc/passwd with 403', async () => {
      const req = makeRequest('/etc/passwd')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks case variation /.ENV with 403', async () => {
      // Requirements: 18.8
      const req = makeRequest('/.ENV')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks URL-encoded /%2Eenv with 403', async () => {
      // Requirements: 18.8
      const req = makeRequest('/%2Eenv')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /.env/ (trailing slash) with 403', async () => {
      // Requirements: 18.8
      const req = makeRequest('/.env/')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /.env.local (starts with pentest path + dot) with 403', async () => {
      // Requirements: 18.8
      const req = makeRequest('/.env.local')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks /admin/panel (sub-path) with 403', async () => {
      const req = makeRequest('/admin/panel')
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })
  })

  // ── Pentest UA ────────────────────────────────────────────────────────────

  describe('pentest UA blocking', () => {
    it('blocks sqlmap UA with 403', async () => {
      // Requirements: 14.2
      const req = makeRequest('/api/chat', { ua: 'sqlmap/1.0' })
      const res = await middleware(req)

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: 'Forbidden' })
    })

    it('blocks nikto UA with 403', async () => {
      const req = makeRequest('/api/chat', { ua: 'Nikto/2.1.6' })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks nmap UA with 403', async () => {
      const req = makeRequest('/api/chat', { ua: 'Nmap Scripting Engine' })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks masscan UA with 403', async () => {
      const req = makeRequest('/api/chat', { ua: 'masscan/1.3' })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks zgrab UA with 403', async () => {
      const req = makeRequest('/api/chat', { ua: 'zgrab/0.x' })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks dirbuster UA with 403', async () => {
      const req = makeRequest('/api/chat', { ua: 'DirBuster-1.0-RC1' })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('blocks UA with pentest tool name embedded in longer string', async () => {
      // Requirements: 18.9
      const req = makeRequest('/api/chat', { ua: 'Mozilla/5.0 (compatible; sqlmap/1.0)' })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('allows a normal browser UA', async () => {
      vi.mocked(verifyToken).mockReturnValue(true)
      const req = makeRequest('/api/chat', {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        cookies: { fp_token: 'a'.repeat(64) },
      })
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })

  // ── Cookie Guard ──────────────────────────────────────────────────────────

  describe('cookie guard (only for /api/chat)', () => {
    it('returns 401 for /api/chat without fp_token cookie', async () => {
      // Requirements: 18.3
      const req = makeRequest('/api/chat')
      const res = await middleware(req)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('returns 401 for /api/chat with invalid fp_token cookie', async () => {
      vi.mocked(verifyToken).mockReturnValue(false)

      const req = makeRequest('/api/chat', { cookies: { fp_token: 'invalid-token' } })
      const res = await middleware(req)

      expect(res.status).toBe(401)
    })

    it('allows /api/chat with valid fp_token cookie', async () => {
      vi.mocked(verifyToken).mockReturnValue(true)

      const req = makeRequest('/api/chat', { cookies: { fp_token: 'a'.repeat(64) } })
      const res = await middleware(req)

      expect(res.status).toBe(200)
    })

    it('does NOT apply cookie guard to /api/auth/fingerprint', async () => {
      // Cookie guard is only for /api/chat — other routes should pass through
      const req = makeRequest('/api/auth/fingerprint')
      const res = await middleware(req)

      // Should not be 401 (no cookie guard for this path)
      expect(res.status).not.toBe(401)
      expect(res.status).toBe(200)
    })
  })

  // ── Check Order ───────────────────────────────────────────────────────────

  describe('check order: pentest path checked before cookie (403 not 401)', () => {
    it('pentest path + no cookie → 403 (not 401)', async () => {
      // Requirements: 18.10
      // If cookie check ran first, we'd get 401. Path check must run first → 403.
      const req = makeRequest('/.env')
      const res = await middleware(req)

      expect(res.status).toBe(403)
      expect(res.status).not.toBe(401)
    })

    it('pentest UA + no cookie on /api/chat → 403 (not 401)', async () => {
      // Requirements: 18.10
      const req = makeRequest('/api/chat', { ua: 'sqlmap/1.0' })
      const res = await middleware(req)

      expect(res.status).toBe(403)
      expect(res.status).not.toBe(401)
    })

    it('blocked IP + no cookie on /api/chat → 401 from the cookie guard', async () => {
      // Requirements: 18.10. The 403 for a blocked IP now comes from the route
      // handler, one layer later. The cookie guard is the first check
      // middleware can fail on, so that is the status it must return.
      vi.mocked(redis.get).mockResolvedValue('1')

      const req = makeRequest('/api/chat', { ip: '10.0.0.1' })
      const res = await middleware(req)

      expect(res.status).toBe(401)
    })
  })

  // ── Normal Requests ───────────────────────────────────────────────────────

  describe('normal requests pass through', () => {
    it('allows a normal GET to /api/auth/fingerprint', async () => {
      const req = makeRequest('/api/auth/fingerprint', {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ip: '203.0.113.1',
      })
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('allows a normal POST to /api/chat with valid cookie', async () => {
      vi.mocked(verifyToken).mockReturnValue(true)

      const req = makeRequest('/api/chat', {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ip: '203.0.113.2',
        cookies: { fp_token: 'a'.repeat(64) },
      })
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })
})
