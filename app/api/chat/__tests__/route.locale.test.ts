/**
 * Locale-focused tests for /api/chat/route.ts.
 *
 * Kept in a separate file from route.test.ts: that file's mocks predate the
 * i18n change and are already out of sync with the route's actual n8n
 * fetch-response handling (it calls `n8nRes.text()`; the existing mocks only
 * provide `.json()`) — a pre-existing, unrelated issue. This file uses its
 * own self-consistent mocks so these locale-specific assertions aren't
 * coupled to that separate breakage.
 *
 * Covers:
 *  - a request with `locale: 'en'` is accepted
 *  - a request omitting `locale` still works (defaults to 'en')
 *  - the system prompt differs between 'en' and 'th'
 *  - calling with 'th' then 'en' then 'th' produces the correct prompt each
 *    time (guards the cross-request prompt-cache bug: the base prompt is
 *    cached once, but the locale directive must never leak between requests)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('# System Prompt\nYou are an AI assistant.'),
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    rpush: vi.fn().mockResolvedValue(2),
    ltrim: vi.fn().mockResolvedValue('OK'),
  },
  keys: {
    session: (id: string) => `session:${id}`,
    memory: (id: string) => `memory:${id}`,
    history: (id: string, chatSessionId?: string) => `chat:history:${id}:${chatSessionId ?? 'default'}`,
    rateLimit: (id: string, ip?: string) => `ratelimit:${ip ?? ''}:${id}`,
    blocked: (ip: string) => `blocked:${ip}`,
  },
}))

// `@/lib/verify-token` is a pure function (hex-format check only) — no need
// to mock it; a real 64-char hex token satisfies it directly.

// The route generates the reply in-process via the Vercel AI SDK. Mock `ai` so
// no model / DB call is made and we can capture the `system` prompt handed to
// the model — that is where the locale-specific system prompt now flows (it
// used to be sent to n8n as `instructions`).
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({ text: 'ok', steps: [] })),
  tool: (def: unknown) => def,
  stepCountIs: (n: number) => n,
  embed: vi.fn(),
}))

import { POST, getSystemPrompt } from '../route'
import { generateText } from 'ai'

const VALID_TOKEN = 'a'.repeat(64)

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Cookie: `fp_token=${VALID_TOKEN}`,
    },
  })
}

// The `system` string handed to generateText on each call. The route builds it
// as `${getSystemPrompt(locale)}\n\n[locale-specific facts]...`, so the
// locale-specific system prompt is always a prefix of the captured value.
let capturedSystems: string[]

beforeEach(() => {
  vi.clearAllMocks()
  capturedSystems = []
  vi.mocked(generateText).mockImplementation(async (opts: { system?: string }) => {
    capturedSystems.push(opts.system ?? '')
    return { text: 'ok', steps: [] } as never
  })

  // Dummy key: the provider is constructed but generateText is mocked, so no
  // real request is made. N8N_WEBHOOK_URL is gone — the route no longer uses it.
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  process.env.ALLOWED_ORIGIN = '*'
})

describe('getSystemPrompt', () => {
  it('differs between th and en', () => {
    expect(getSystemPrompt('th')).not.toBe(getSystemPrompt('en'))
  })

  it('th prompt contains the Thai-response directive', () => {
    expect(getSystemPrompt('th')).toContain('ตอบเป็นภาษาไทยเสมอ')
  })

  it('en prompt contains the English-response directive', () => {
    expect(getSystemPrompt('en')).toContain('Respond in English')
  })

  it('both share the same cached base prompt content', () => {
    const base = '# System Prompt\nYou are an AI assistant.'
    expect(getSystemPrompt('th').startsWith(base)).toBe(true)
    expect(getSystemPrompt('en').startsWith(base)).toBe(true)
  })

  it("defaults to 'en' when called with no argument", () => {
    expect(getSystemPrompt()).toBe(getSystemPrompt('en'))
  })
})

describe('POST /api/chat — locale handling', () => {
  it("accepts a request with locale: 'en' and returns 200", async () => {
    const res = await POST(makeRequest({ message: 'hello', locale: 'en' }))
    expect(res.status).toBe(200)
  })

  it('accepts a request omitting locale and returns 200 (defaults to en)', async () => {
    const res = await POST(makeRequest({ message: 'hello' }))
    expect(res.status).toBe(200)
    expect(capturedSystems[0].startsWith(getSystemPrompt('en'))).toBe(true)
  })

  it("rejects an invalid locale value with 400", async () => {
    const res = await POST(makeRequest({ message: 'hello', locale: 'fr' }))
    expect(res.status).toBe(400)
  })

  it('hands the model the en-specific system prompt when locale is en', async () => {
    await POST(makeRequest({ message: 'hello', locale: 'en' }))
    expect(capturedSystems[0].startsWith(getSystemPrompt('en'))).toBe(true)
    expect(capturedSystems[0]).toContain('Respond in English')
  })

  it('hands the model the th-specific system prompt when locale is th', async () => {
    await POST(makeRequest({ message: 'hello', locale: 'th' }))
    expect(capturedSystems[0].startsWith(getSystemPrompt('th'))).toBe(true)
    expect(capturedSystems[0]).toContain('ตอบเป็นภาษาไทยเสมอ')
  })

  it("does not poison the cached prompt across requests: th -> en -> th all produce the correct locale-specific prompt", async () => {
    await POST(makeRequest({ message: 'msg 1', locale: 'th' }))
    await POST(makeRequest({ message: 'msg 2', locale: 'en' }))
    await POST(makeRequest({ message: 'msg 3', locale: 'th' }))

    expect(capturedSystems).toHaveLength(3)
    expect(capturedSystems[0].startsWith(getSystemPrompt('th'))).toBe(true)
    expect(capturedSystems[1].startsWith(getSystemPrompt('en'))).toBe(true)
    expect(capturedSystems[2].startsWith(getSystemPrompt('th'))).toBe(true)
    // The 1st and 3rd (both th) must be identical, and different from the en one.
    expect(capturedSystems[0]).toBe(capturedSystems[2])
    expect(capturedSystems[0]).not.toBe(capturedSystems[1])
  })

  it('the me facts handed to the model reflect the requested locale (en differs from th)', async () => {
    // The locale-specific `me` data is embedded into the system prompt (the
    // "always-on facts" block) rather than sent as a separate n8n `me` payload.
    // en and th datasets diverge (title/tagline/bio + locale directive), so the
    // two system strings must not be identical.
    await POST(makeRequest({ message: 'hi', locale: 'en' }))
    await POST(makeRequest({ message: 'hi', locale: 'th' }))

    expect(capturedSystems).toHaveLength(2)
    expect(capturedSystems[0]).toBeTruthy()
    expect(capturedSystems[1]).toBeTruthy()
    expect(capturedSystems[0]).not.toBe(capturedSystems[1])
  })
})
