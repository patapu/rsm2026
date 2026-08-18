/**
 * Tests for /api/chat/route.ts
 * Covers:
 *   Sub-task 6.1 — Property 8: Unauthenticated Chat Rejection (fast-check)
 *   Sub-task 6.2 — Property 9: Rate Limit Enforcement (fast-check)
 *   Sub-task 6.3 — Property 10: Chat Request Payload Completeness (fast-check)
 *   Sub-task 6.4 — Property 11: Chat History Bounded Growth (fast-check)
 *   Sub-task 6.5 — Property 12: Zod Validation Rejects Malformed Chat Requests (fast-check)
 *   Sub-task 6.6 — Property 13: CORS Origin Enforcement (fast-check)
 *   Sub-task 6.7 — Unit tests
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 11.8, 11.9, 11.10, 13.4, 14.5, 14.6, 18.3, 18.4, 18.6, 18.7
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest } from 'next/server'

// ──────────────────────────────────────────
//  Mocks — must be declared before imports
// ──────────────────────────────────────────

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('# System Prompt\nYou are an AI assistant.'),
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    rpush: vi.fn().mockResolvedValue(2),
    ltrim: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
  keys: {
    session: (id: string) => `session:${id}`,
    memory: (id: string) => `memory:${id}`,
    history: (id: string, chatSessionId?: string) =>
      chatSessionId && chatSessionId !== 'default'
        ? `chat:history:${id}:${chatSessionId}`
        : `chat:history:${id}`,
    rateLimit: (id: string, ip?: string) =>
      ip ? `ratelimit:${ip}:${id}` : `ratelimit:${id}`,
    fpMint: (ip: string) => `fp-mint:${ip}`,
    blocked: (ip: string) => `blocked:${ip}`,
  },
}))

vi.mock('@/lib/fingerprint', () => ({
  createVisitorId: vi.fn().mockReturnValue('a'.repeat(64)),
  verifyToken: vi.fn().mockImplementation((token: string) => /^[0-9a-f]{64}$/.test(token)),
}))

// The route generates the reply with the Vercel AI SDK (`generateText`) instead
// of forwarding to an n8n webhook. Mock the `ai` module so the reply is
// deterministic and no network / DB call is made. `tool` and `stepCountIs` are
// pass-throughs (the route builds a tools object and a stop condition with them);
// `embed` is provided because '@/lib/rag/retrieve' imports it, though it is never
// invoked while `generateText` is mocked.
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({ text: 'สวัสดีครับ', steps: [] })),
  // `streamText` powers the SSE path (Accept: text/event-stream). It is
  // synchronous and returns an object whose `stream` is an async iterable of
  // parts — the mock mirrors a realistic RAG turn: the model calls searchResume,
  // reads the result, then emits the reply text.
  streamText: vi.fn(() => ({
    stream: (async function* () {
      yield { type: 'tool-input-start', id: 'call-1', toolName: 'searchResume' }
      yield {
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'searchResume',
        input: { query: 'ประสบการณ์' },
      }
      yield {
        type: 'tool-result',
        toolCallId: 'call-1',
        toolName: 'searchResume',
        input: { query: 'ประสบการณ์' },
        output: [
          { title: 'โปรเจกต์: S-CRM Platform', content: 'x' },
          { title: 'ทักษะ: DevOps & Cloud', content: 'y' },
        ],
      }
      yield { type: 'text-delta', id: 'text-1', text: 'สวัสดี' }
      yield { type: 'text-delta', id: 'text-1', text: 'ครับ' }
    })(),
  })),
  tool: (def: unknown) => def,
  stepCountIs: (n: number) => n,
  embed: vi.fn(),
}))

// ──────────────────────────────────────────
//  Imports after mocks
// ──────────────────────────────────────────

import { POST, toStatusTopics } from '../route'
import { redis } from '@/lib/redis'
import { verifyToken } from '@/lib/fingerprint'
import { generateText, streamText } from 'ai'

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

const VALID_TOKEN = 'a'.repeat(64) // matches /^[0-9a-f]{64}$/
const VALID_MESSAGE = 'สวัสดีครับ'

function makeRequest(
  body: unknown,
  cookies: Record<string, string> = {},
  headers: Record<string, string> = {},
) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const req = new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...headers,
    },
  })
  return req
}

function makeValidRequest(message = VALID_MESSAGE, extraHeaders: Record<string, string> = {}) {
  return makeRequest({ message }, { fp_token: VALID_TOKEN }, extraHeaders)
}

// ──────────────────────────────────────────
//  Reset mocks before each test
// ──────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Default mock: verifyToken returns true for 64-char hex
  vi.mocked(verifyToken).mockImplementation((token: string) => /^[0-9a-f]{64}$/.test(token))

  // Default mock: redis.incr returns 1 (first request, under limit)
  vi.mocked(redis.incr).mockResolvedValue(1)
  // Default mock: redis.exists returns 1 (session present)
  vi.mocked(redis.exists).mockResolvedValue(1)
  vi.mocked(redis.lrange).mockResolvedValue([])
  vi.mocked(redis.rpush).mockResolvedValue(2)
  vi.mocked(redis.ltrim).mockResolvedValue('OK')
  vi.mocked(redis.expire).mockResolvedValue(1)

  // Default mock: generateText resolves to a fixed reply. Implementations set
  // in a vi.mock factory survive vi.clearAllMocks() (only call history is
  // cleared), so this default holds across every test unless overridden.
  vi.mocked(generateText).mockResolvedValue({ text: 'สวัสดีครับ', steps: [] } as never)

  // Set required env vars. The model provider reads GOOGLE_GENERATIVE_AI_API_KEY
  // at construction; a dummy value is enough because generateText is mocked and
  // no real request is issued. N8N_WEBHOOK_URL is gone — the route no longer
  // forwards to n8n.
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  process.env.ALLOWED_ORIGIN = '*'
})

afterEach(() => {
  process.env.ALLOWED_ORIGIN = '*'
})

// ──────────────────────────────────────────
//  Sub-task 6.1: Property 8 — Unauthenticated Chat Rejection
// ──────────────────────────────────────────

// Feature: resume-website, Property 8: Unauthenticated Chat Rejection
describe('Property 8: Unauthenticated Chat Rejection', () => {
  it(
    'POST /api/chat without a valid fp_token always returns 401',
    async () => {
      // Validates: Requirements 11.1, 11.2, 18.3
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary strings that are NOT valid 64-char hex tokens
          fc.oneof(
            fc.constant(''), // empty string
            fc.constant(undefined as unknown as string), // absent cookie
            fc.string({ maxLength: 63 }), // too short
            fc.string({ minLength: 65 }), // too long
            fc.stringMatching(/[^0-9a-f]/), // contains non-hex chars
          ),
          async (invalidToken) => {
            vi.clearAllMocks()
            // verifyToken returns false for all these invalid tokens
            vi.mocked(verifyToken).mockImplementation(
              (token: string) => /^[0-9a-f]{64}$/.test(token),
            )
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({ reply: 'test' }),
            })
            vi.mocked(redis.incr).mockResolvedValue(1)
            vi.mocked(redis.lrange).mockResolvedValue([])

            const cookies: Record<string, string> =
              invalidToken !== undefined && invalidToken !== ''
                ? { fp_token: invalidToken }
                : {}
            const req = makeRequest({ message: 'hello' }, cookies)
            const res = await POST(req)

            return res.status === 401
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 6.2: Property 9 — Rate Limit Enforcement
// ──────────────────────────────────────────

// Feature: resume-website, Property 9: Rate Limit Enforcement
describe('Property 9: Rate Limit Enforcement', () => {
  it(
    'requests beyond RATE_LIMIT_MAX always return 429',
    async () => {
      // Validates: Requirements 11.3, 11.4, 18.4
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 21, max: 100 }),
          async (count) => {
            vi.clearAllMocks()
            vi.mocked(verifyToken).mockReturnValue(true)
            // Simulate Redis counter already at `count` (above limit of 20)
            vi.mocked(redis.incr).mockResolvedValue(count)
            vi.mocked(redis.lrange).mockResolvedValue([])
            vi.mocked(redis.expire).mockResolvedValue(1)
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({ reply: 'test' }),
            })

            const req = makeValidRequest()
            const res = await POST(req)

            return res.status === 429
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 6.3: Property 10 — Chat Request Payload Completeness
// ──────────────────────────────────────────

// Feature: resume-website, Property 10: Chat Request Payload Completeness
// The reply is now generated in-process via the Vercel AI SDK instead of being
// POSTed to an n8n webhook, so "payload completeness" is re-expressed as: the
// model always receives the user's message (as `prompt`), a non-empty system
// prompt (as `system`), and the searchResume retrieval tool. This preserves the
// original intent — every request hands the model the full context it needs.
describe('Property 10: Chat Request Payload Completeness', () => {
  it(
    'generateText always receives the message, a system prompt, and the retrieval tool',
    async () => {
      // Validates: Requirements 11.7
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (message) => {
            vi.clearAllMocks()
            vi.mocked(verifyToken).mockReturnValue(true)
            vi.mocked(redis.incr).mockResolvedValue(1)
            vi.mocked(redis.lrange).mockResolvedValue([])
            vi.mocked(redis.rpush).mockResolvedValue(2)
            vi.mocked(redis.ltrim).mockResolvedValue('OK')
            vi.mocked(redis.expire).mockResolvedValue(1)

            const req = makeRequest({ message }, { fp_token: VALID_TOKEN })
            const res = await POST(req)

            if (res.status !== 200) return false

            const args = vi.mocked(generateText).mock.calls[0]?.[0] as
              | { prompt?: unknown; system?: unknown; tools?: Record<string, unknown> }
              | undefined
            if (!args) return false

            return (
              args.prompt === message &&
              typeof args.system === 'string' &&
              (args.system as string).length > 0 &&
              !!args.tools &&
              'searchResume' in args.tools
            )
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 6.4: Property 11 — Chat History Bounded Growth
// ──────────────────────────────────────────

// Feature: resume-website, Property 11: Chat History Bounded Growth
describe('Property 11: Chat History Bounded Growth', () => {
  it(
    'history grows by exactly 2 entries per exchange and never exceeds 20',
    async () => {
      // Validates: Requirements 11.8, 13.4
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 15 }),
          async (exchanges) => {
            vi.clearAllMocks()
            vi.mocked(verifyToken).mockReturnValue(true)
            vi.mocked(redis.incr).mockResolvedValue(1)
            vi.mocked(redis.expire).mockResolvedValue(1)
            vi.mocked(redis.ltrim).mockResolvedValue('OK')

            // Track total rpush calls across all exchanges
            let totalRpushCalls = 0
            vi.mocked(redis.rpush).mockImplementation(async () => {
              totalRpushCalls++
              return totalRpushCalls * 2
            })

            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({ reply: 'AI reply' }),
            })

            // Simulate N exchanges
            for (let i = 0; i < exchanges; i++) {
              // Simulate growing history returned by lrange
              const existingHistory = Array.from({ length: Math.min(i * 2, 5) }, (_, idx) =>
                JSON.stringify({ role: idx % 2 === 0 ? 'user' : 'assistant', content: `msg${idx}` }),
              )
              vi.mocked(redis.lrange).mockResolvedValue(existingHistory)

              const req = makeRequest({ message: `message ${i}` }, { fp_token: VALID_TOKEN })
              const res = await POST(req)
              if (res.status !== 200) return false
            }

            // Each exchange should call rpush once (with 2 messages)
            // totalRpushCalls should equal exchanges
            if (totalRpushCalls !== exchanges) return false

            // ltrim is called with -20, -1 each time — ensuring max 20 entries
            const ltrimCalls = vi.mocked(redis.ltrim).mock.calls
            if (ltrimCalls.length !== exchanges) return false

            // Verify ltrim always uses -20, -1 to cap at 20
            for (const call of ltrimCalls) {
              const [, start, end] = call as [string, number, number]
              if (start !== -20 || end !== -1) return false
            }

            return true
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 6.5: Property 12 — Zod Validation Rejects Malformed Chat Requests
// ──────────────────────────────────────────

// Feature: resume-website, Property 12: Zod Validation Rejects Malformed Chat Requests
describe('Property 12: Zod Validation Rejects Malformed Chat Requests', () => {
  it(
    'malformed request bodies always return 400 with a field name',
    async () => {
      // Validates: Requirements 11.10, 14.6, 18.6
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Missing message field
            fc.record({ other: fc.string() }),
            // Wrong type: message is a number
            fc.record({ message: fc.integer() }),
            // Wrong type: message is null
            fc.constant({ message: null }),
            // Wrong type: message is boolean
            fc.record({ message: fc.boolean() }),
            // Empty message (violates min(1))
            fc.constant({ message: '' }),
            // Oversized message (violates max(500))
            fc.constant({ message: 'x'.repeat(501) }),
            // Empty object
            fc.constant({}),
          ),
          async (invalidBody) => {
            vi.clearAllMocks()
            vi.mocked(verifyToken).mockReturnValue(true)
            vi.mocked(redis.incr).mockResolvedValue(1)
            vi.mocked(redis.lrange).mockResolvedValue([])
            vi.mocked(redis.expire).mockResolvedValue(1)
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({ reply: 'test' }),
            })

            const req = makeRequest(invalidBody, { fp_token: VALID_TOKEN })
            const res = await POST(req)

            if (res.status !== 400) return false

            const body = await res.json()
            // Must have an error message
            if (!body.error) return false

            return true
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 6.6: Property 13 — CORS Origin Enforcement
// ──────────────────────────────────────────

// Feature: resume-website, Property 13: CORS Origin Enforcement
describe('Property 13: CORS Origin Enforcement', () => {
  it(
    'requests from non-allowed origins always return 403 and are not processed',
    async () => {
      // Validates: Requirements 14.5, 18.7
      // Set ALLOWED_ORIGIN to a specific value for CORS tests
      process.env.ALLOWED_ORIGIN = 'https://pakorn.dev'

      // Re-import the module to pick up the new env var
      // Since modules are cached, we test via the route behavior directly
      // The route reads ALLOWED_ORIGIN at module level, so we need to
      // test with a fresh module or test the behavior through the route

      await fc.assert(
        fc.asyncProperty(
          // Generate URLs that are NOT the allowed origin
          fc.webUrl().filter((url) => {
            try {
              const origin = new URL(url).origin
              return origin !== 'https://pakorn.dev'
            } catch {
              return false
            }
          }),
          async (url) => {
            vi.clearAllMocks()
            vi.mocked(verifyToken).mockReturnValue(true)
            vi.mocked(redis.incr).mockResolvedValue(1)
            vi.mocked(redis.lrange).mockResolvedValue([])
            vi.mocked(redis.expire).mockResolvedValue(1)
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({ reply: 'test' }),
            })

            let origin: string
            try {
              origin = new URL(url).origin
            } catch {
              return true // skip invalid URLs
            }

            const req = makeRequest({ message: 'hello' }, { fp_token: VALID_TOKEN }, {
              Origin: origin,
            })

            // Dynamically override ALLOWED_ORIGIN for this test
            // Since the route reads it at call time via process.env, this works
            const savedOrigin = process.env.ALLOWED_ORIGIN
            process.env.ALLOWED_ORIGIN = 'https://pakorn.dev'

            const res = await POST(req)

            process.env.ALLOWED_ORIGIN = savedOrigin

            // n8n fetch should NOT have been called (request not processed)
            const fetchCalled = vi.mocked(global.fetch).mock.calls.length > 0

            return res.status === 403 && !fetchCalled
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// ──────────────────────────────────────────
//  Sub-task 6.7: Unit tests for /api/chat
// ──────────────────────────────────────────

describe('POST /api/chat', () => {
  describe('authentication', () => {
    it('returns 401 when fp_token cookie is absent', async () => {
      // Requirements: 11.1, 11.2
      const req = makeRequest({ message: VALID_MESSAGE })
      const res = await POST(req)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 401 when fp_token is invalid (not 64-char hex)', async () => {
      // Requirements: 11.1, 11.2
      const req = makeRequest({ message: VALID_MESSAGE }, { fp_token: 'invalid-token' })
      const res = await POST(req)

      expect(res.status).toBe(401)
    })

    it('returns 401 when fp_token is empty string', async () => {
      // Requirements: 11.1, 11.2
      vi.mocked(verifyToken).mockReturnValue(false)
      const req = makeRequest({ message: VALID_MESSAGE }, { fp_token: '' })
      const res = await POST(req)

      expect(res.status).toBe(401)
    })
  })

  describe('request validation', () => {
    it('returns 400 when message field is missing', async () => {
      // Requirements: 11.10
      const req = makeRequest({}, { fp_token: VALID_TOKEN })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 400 when message is empty string', async () => {
      // Requirements: 11.10
      const req = makeRequest({ message: '' }, { fp_token: VALID_TOKEN })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })

    it('returns 400 when message exceeds 500 characters', async () => {
      // Requirements: 11.10
      const req = makeRequest({ message: 'x'.repeat(501) }, { fp_token: VALID_TOKEN })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })

    it('returns 400 for non-JSON body', async () => {
      // Requirements: 11.10
      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: 'not-json',
        headers: {
          'Content-Type': 'text/plain',
          Cookie: `fp_token=${VALID_TOKEN}`,
        },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded (count > 20)', async () => {
      // Requirements: 11.3, 11.4
      vi.mocked(redis.incr).mockResolvedValue(21)

      const req = makeValidRequest()
      const res = await POST(req)

      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 200 when count is exactly at the limit (count = 20)', async () => {
      // Requirements: 11.3, 11.4
      vi.mocked(redis.incr).mockResolvedValue(20)

      const req = makeValidRequest()
      const res = await POST(req)

      expect(res.status).toBe(200)
    })

    it('sets TTL on rate limit key when count is 1 (first request)', async () => {
      // Requirements: 11.3
      vi.mocked(redis.incr).mockResolvedValue(1)

      const req = makeValidRequest()
      await POST(req)

      // Rate limit key is now scoped by IP + visitorId; no IP headers in the
      // test request means the route resolves ip to 'unknown'.
      expect(vi.mocked(redis.expire)).toHaveBeenCalledWith(
        `ratelimit:unknown:${VALID_TOKEN}`,
        60,
      )
    })
  })

  describe('successful chat', () => {
    it('returns { reply } on success', async () => {
      // Requirements: 11.9
      const req = makeValidRequest()
      const res = await POST(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('reply')
      expect(typeof body.reply).toBe('string')
    })

    it('hands the model the user message, system prompt, and retrieval tool', async () => {
      // Requirements: 11.7
      // Re-expressed from the old "n8n payload" assertion: the route now calls
      // generateText in-process rather than POSTing a payload to n8n. The same
      // intent (the model receives the message + system prompt + a way to pull
      // resume context) is asserted against generateText's call arguments.
      const req = makeValidRequest()
      await POST(req)

      expect(vi.mocked(generateText)).toHaveBeenCalledOnce()
      const args = vi.mocked(generateText).mock.calls[0][0] as {
        prompt: string
        system: string
        tools: Record<string, unknown>
      }
      expect(args.prompt).toBe(VALID_MESSAGE)
      expect(typeof args.system).toBe('string')
      // fs is mocked to return this base prompt; it must flow into the system arg.
      expect(args.system).toContain('You are an AI assistant.')
      expect(args.tools).toHaveProperty('searchResume')
    })

    it('saves user message and AI reply to Redis history', async () => {
      // Requirements: 11.8
      const req = makeValidRequest()
      await POST(req)

      expect(vi.mocked(redis.rpush)).toHaveBeenCalledOnce()
      const [key, userMsg, aiMsg] = vi.mocked(redis.rpush).mock.calls[0] as [string, string, string]
      expect(key).toBe(`chat:history:${VALID_TOKEN}`)

      const parsedUser = JSON.parse(userMsg)
      expect(parsedUser.role).toBe('user')
      expect(parsedUser.content).toBe(VALID_MESSAGE)

      const parsedAi = JSON.parse(aiMsg)
      expect(parsedAi.role).toBe('assistant')
    })

    it('trims history to max 20 entries', async () => {
      // Requirements: 11.8, 13.4
      const req = makeValidRequest()
      await POST(req)

      expect(vi.mocked(redis.ltrim)).toHaveBeenCalledWith(
        `chat:history:${VALID_TOKEN}`,
        -20,
        -1,
      )
    })

    it('sets 24-hour TTL on history key', async () => {
      // Requirements: 11.8, 13.4
      // The route sets the history TTL to 86400s (24h, matching the session
      // TTL) — see route.ts section 8. The value asserted here tracks that
      // source-of-truth behavior, which is outside this test's scope to change.
      const req = makeValidRequest()
      await POST(req)

      // expire is called for both rateLimit (60s) and history (86400s)
      const expireCalls = vi.mocked(redis.expire).mock.calls
      const historyExpire = expireCalls.find(
        ([key, ttl]) => key === `chat:history:${VALID_TOKEN}` && ttl === 86400,
      )
      expect(historyExpire).toBeDefined()
    })

    it('loads the visitor memory for prior-context grounding', async () => {
      // Requirements: 11.5
      // The RAG route no longer fetches recent history to feed the model (that
      // was part of the old n8n payload). Prior-session context now comes from
      // the per-visitor memory key, which the route reads before generating.
      const req = makeValidRequest()
      await POST(req)

      expect(vi.mocked(redis.get)).toHaveBeenCalledWith(`memory:${VALID_TOKEN}`)
    })
  })

  describe('generation error handling', () => {
    // The upstream reply source changed from an n8n webhook fetch to an
    // in-process generateText call, but the contract is unchanged: any failure
    // producing the reply is caught and surfaced as 503 Service unavailable.
    it('returns 503 when generateText rejects', async () => {
      vi.mocked(generateText).mockRejectedValueOnce(new Error('model unavailable'))

      const req = makeValidRequest()
      const res = await POST(req)

      expect(res.status).toBe(503)
    })

    it('returns 503 when the retrieval/generation layer throws synchronously', async () => {
      vi.mocked(generateText).mockImplementationOnce(() => {
        throw new Error('boom')
      })

      const req = makeValidRequest()
      const res = await POST(req)

      expect(res.status).toBe(503)
    })
  })

  describe('CORS', () => {
    it('allows requests when ALLOWED_ORIGIN is *', async () => {
      process.env.ALLOWED_ORIGIN = '*'

      const req = makeValidRequest()
      const res = await POST(req)

      expect(res.status).toBe(200)
    })

    it('returns 403 for requests from non-allowed origin', async () => {
      process.env.ALLOWED_ORIGIN = 'https://pakorn.dev'

      const req = makeRequest(
        { message: VALID_MESSAGE },
        { fp_token: VALID_TOKEN },
        { Origin: 'https://evil.com' },
      )
      const res = await POST(req)

      expect(res.status).toBe(403)
    })

    it('allows requests from the allowed origin', async () => {
      process.env.ALLOWED_ORIGIN = 'https://pakorn.dev'

      const req = makeRequest(
        { message: VALID_MESSAGE },
        { fp_token: VALID_TOKEN },
        { Origin: 'https://pakorn.dev' },
      )
      const res = await POST(req)

      expect(res.status).toBe(200)
    })
  })
})

// ──────────────────────────────────────────
//  IP blacklist
//
//  Enforced here rather than in middleware, which runs on the Edge Runtime
//  and cannot reach Redis. middleware.test.ts asserts the other half: that
//  middleware stays out of the way instead of faking the check.
// ──────────────────────────────────────────

describe('POST /api/chat — IP blacklist', () => {
  it('returns 403 for a blocked IP without ever reaching the model', async () => {
    vi.mocked(redis.get).mockImplementation(async (key) => {
      if (key === 'blocked:1.2.3.4') return '1'
      return null
    })

    const req = makeRequest(
      { message: VALID_MESSAGE },
      { fp_token: VALID_TOKEN },
      { 'x-forwarded-for': '1.2.3.4' },
    )
    const res = await POST(req)

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
    expect(generateText).not.toHaveBeenCalled()
  })

  it('reads the first entry of x-forwarded-for, not the whole chain', async () => {
    // The client IP is the leftmost hop. Matching on the raw header would let
    // a blocked visitor escape by adding a proxy in front.
    vi.mocked(redis.get).mockImplementation(async (key) => {
      if (key === 'blocked:1.2.3.4') return '1'
      return null
    })

    const req = makeRequest(
      { message: VALID_MESSAGE },
      { fp_token: VALID_TOKEN },
      { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    )
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('lets a request from an unblocked IP through', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)

    const req = makeRequest(
      { message: VALID_MESSAGE },
      { fp_token: VALID_TOKEN },
      { 'x-forwarded-for': '5.6.7.8' },
    )
    const res = await POST(req)

    expect(res.status).toBe(200)
  })
})

// ──────────────────────────────────────────
//  Streaming reply (Accept: text/event-stream)
// ──────────────────────────────────────────

describe('POST /api/chat — SSE streaming', () => {
  function makeStreamRequest(message = VALID_MESSAGE) {
    return makeRequest({ message }, { fp_token: VALID_TOKEN }, { Accept: 'text/event-stream' })
  }

  /** Drains a streaming Response body into one string. */
  async function drain(res: Response): Promise<string> {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let out = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out += decoder.decode(value, { stream: true })
    }
    return out
  }

  it('returns the SSE headers required to survive a buffering proxy', async () => {
    const res = await POST(makeStreamRequest())

    expect(res.headers.get('content-type')).toBe('text/event-stream')
    // `no-transform` opts the response out of Next's gzip layer, which would
    // otherwise buffer the deltas and defeat streaming entirely.
    expect(res.headers.get('cache-control')).toBe('no-cache, no-transform')
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    expect(res.body).toBeTruthy()
  })

  it('emits one chunk event per delta, then a done event with the full text', async () => {
    const body = await drain(await POST(makeStreamRequest()))

    expect(body).toContain('event: chunk\ndata: {"text":"สวัสดี"}')
    expect(body).toContain('event: chunk\ndata: {"text":"ครับ"}')
    expect(body).toContain('event: done\ndata: {"text":"สวัสดีครับ"}')
  })

  it('uses streamText — not generateText — on the streaming path', async () => {
    await drain(await POST(makeStreamRequest()))

    expect(vi.mocked(streamText)).toHaveBeenCalledOnce()
    expect(vi.mocked(generateText)).not.toHaveBeenCalled()
  })

  it('hands the streaming call the same message, system prompt and retrieval tool', async () => {
    await drain(await POST(makeStreamRequest()))

    const args = vi.mocked(streamText).mock.calls[0][0] as {
      prompt: string
      system: string
      tools: Record<string, unknown>
    }
    expect(args.prompt).toBe(VALID_MESSAGE)
    expect(args.system).toContain('You are an AI assistant.')
    expect(args.tools).toHaveProperty('searchResume')
  })

  it('persists the streamed reply to Redis history once the stream ends', async () => {
    await drain(await POST(makeStreamRequest()))

    expect(vi.mocked(redis.rpush)).toHaveBeenCalledOnce()
    const [key, userMsg, aiMsg] = vi.mocked(redis.rpush).mock.calls[0] as [string, string, string]
    expect(key).toBe(`chat:history:${VALID_TOKEN}`)
    expect(JSON.parse(userMsg).content).toBe(VALID_MESSAGE)
    // The assistant entry holds the ASSEMBLED reply, not a single delta.
    expect(JSON.parse(aiMsg).content).toBe('สวัสดีครับ')
    expect(vi.mocked(redis.ltrim)).toHaveBeenCalledWith(`chat:history:${VALID_TOKEN}`, -20, -1)
  })

  it('announces the tool call before any text, then its result', async () => {
    const body = await drain(await POST(makeStreamRequest()))

    const toolFrames = body
      .split('\n\n')
      .filter((frame) => frame.startsWith('event: tool'))
      .map((frame) => JSON.parse(frame.slice(frame.indexOf('data: ') + 6)))

    expect(toolFrames).toEqual([
      { tool: 'searchResume', phase: 'start', id: 'call-1' },
      {
        tool: 'searchResume',
        phase: 'end',
        id: 'call-1',
        count: 2,
        // Site default locale is English, so the Thai category words are
        // dropped and only the proper nouns survive.
        topics: ['S-CRM Platform', 'DevOps & Cloud'],
      },
    ])
    // The whole point: the visitor learns what the agent is doing BEFORE the
    // first text delta lands seven seconds later.
    expect(body.indexOf('event: tool')).toBeLessThan(body.indexOf('event: chunk'))
  })

  it('keeps the Thai category label when the visitor asked for Thai', async () => {
    const req = makeRequest(
      { message: VALID_MESSAGE, locale: 'th' },
      { fp_token: VALID_TOKEN },
      { Accept: 'text/event-stream' },
    )
    const body = await drain(await POST(req))

    expect(body).toContain('"topics":["โปรเจกต์ S-CRM Platform","ทักษะ DevOps & Cloud"]')
  })

  it('announces a tool call once even though two parts signal its start', async () => {
    // The mock emits both `tool-input-start` and `tool-call` for call-1; only
    // the first should reach the client.
    const body = await drain(await POST(makeStreamRequest()))

    expect(body.match(/"phase":"start"/g)).toHaveLength(1)
  })

  it('reports a non-fatal error part as an error event', async () => {
    vi.mocked(streamText).mockImplementationOnce(
      () =>
        ({
          stream: (async function* () {
            yield { type: 'text-delta', id: 'text-1', text: 'partial' }
            // Errors that do not kill the stream arrive as a part rather than
            // being thrown, and `textStream` used to swallow them entirely.
            yield { type: 'error', error: new Error('model unavailable') }
          })(),
        }) as never,
    )

    const res = await POST(makeStreamRequest())
    const body = await drain(res)

    expect(res.status).toBe(200)
    expect(body).toContain('event: error')
    expect(body).not.toContain('event: done')
    // The partial reply is still saved, so history matches what was displayed.
    const [, , aiMsg] = vi.mocked(redis.rpush).mock.calls[0] as [string, string, string]
    expect(JSON.parse(aiMsg).content).toBe('partial')
  })

  it('reports a thrown mid-stream failure as an error event, not an HTTP status', async () => {
    vi.mocked(streamText).mockImplementationOnce(
      () =>
        ({
          stream: (async function* () {
            throw new Error('model unavailable')
          })(),
        }) as never,
    )

    const res = await POST(makeStreamRequest())
    // The status is already committed to 200 by the time the model fails.
    expect(res.status).toBe(200)
    expect(await drain(res)).toContain('event: error')
  })

  it('still rejects an unauthenticated stream request with a real 401', async () => {
    // Auth runs before the body is committed, so proper status codes survive.
    const req = makeRequest({ message: VALID_MESSAGE }, {}, { Accept: 'text/event-stream' })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('returns JSON when the client does not ask for a stream', async () => {
    const res = await POST(makeValidRequest())

    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toHaveProperty('reply')
  })
})

// ──────────────────────────────────────────
//  toStatusTopics — retrieval topics for the status line
// ──────────────────────────────────────────

describe('toStatusTopics', () => {
  const chunk = (title: string) => ({ title, content: 'irrelevant' })

  it('replaces the label colon with a space in Thai', () => {
    expect(toStatusTopics([chunk('ประสบการณ์: MSC')], 'th')).toEqual(['ประสบการณ์ MSC'])
    expect(toStatusTopics([chunk('โปรเจกต์: S-CRM Platform')], 'th')).toEqual([
      'โปรเจกต์ S-CRM Platform',
    ])
  })

  it('keeps a title that carries no label', () => {
    expect(toStatusTopics([chunk('การศึกษา')], 'th')).toEqual(['การศึกษา'])
  })

  it('drops the Thai label in English and keeps the proper noun', () => {
    expect(toStatusTopics([chunk('ทักษะ: DevOps & Cloud')], 'en')).toEqual(['DevOps & Cloud'])
  })

  it('drops a Thai-only title in English rather than showing Thai to an English reader', () => {
    expect(toStatusTopics([chunk('การศึกษา')], 'en')).toEqual([])
  })

  it('drops a title long enough to be a sentence', () => {
    // The profile chunk, which reads as a statement rather than a topic.
    const profile = 'ปกร เชาวนประเสริฐ ตำแหน่ง Lead Developer'
    expect(toStatusTopics([chunk(profile)], 'th')).toEqual([])
    expect(toStatusTopics([chunk(profile)], 'en')).toEqual([])
  })

  it('carries at most three topics', () => {
    const output = ['a', 'b', 'c', 'd', 'e'].map((n) => chunk(`ทักษะ: ${n}`))
    expect(toStatusTopics(output, 'en')).toEqual(['a', 'b', 'c'])
  })

  it('dedupes repeated titles', () => {
    const output = [chunk('ทักษะ: DevOps'), chunk('ทักษะ: DevOps'), chunk('ทักษะ: Cloud')]
    expect(toStatusTopics(output, 'en')).toEqual(['DevOps', 'Cloud'])
  })

  it('returns nothing for output that is not a list of titled chunks', () => {
    expect(toStatusTopics(undefined, 'th')).toEqual([])
    expect(toStatusTopics('not a list', 'th')).toEqual([])
    expect(toStatusTopics([null, {}, { title: 42 }], 'th')).toEqual([])
  })
})
