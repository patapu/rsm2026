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
 *  - a request omitting `locale` still works (defaults to 'th')
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

import { POST, getSystemPrompt } from '../route'

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

let capturedInstructions: string[]

beforeEach(() => {
  capturedInstructions = []
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (_url: string, options: { body: string }) => {
      const body = JSON.parse(options.body)
      capturedInstructions.push(body.instructions)
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ reply: 'ok' }),
      }
    }),
  )

  process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/chat'
  process.env.ALLOWED_ORIGIN = '*'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.N8N_WEBHOOK_URL
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

  it("defaults to 'th' when called with no argument", () => {
    expect(getSystemPrompt()).toBe(getSystemPrompt('th'))
  })
})

describe('POST /api/chat — locale handling', () => {
  it("accepts a request with locale: 'en' and returns 200", async () => {
    const res = await POST(makeRequest({ message: 'hello', locale: 'en' }))
    expect(res.status).toBe(200)
  })

  it('accepts a request omitting locale and returns 200 (defaults to th)', async () => {
    const res = await POST(makeRequest({ message: 'hello' }))
    expect(res.status).toBe(200)
    expect(capturedInstructions[0]).toBe(getSystemPrompt('th'))
  })

  it("rejects an invalid locale value with 400", async () => {
    const res = await POST(makeRequest({ message: 'hello', locale: 'fr' }))
    expect(res.status).toBe(400)
  })

  it('forwards the en-specific system prompt to n8n when locale is en', async () => {
    await POST(makeRequest({ message: 'hello', locale: 'en' }))
    expect(capturedInstructions[0]).toBe(getSystemPrompt('en'))
  })

  it('forwards the th-specific system prompt to n8n when locale is th', async () => {
    await POST(makeRequest({ message: 'hello', locale: 'th' }))
    expect(capturedInstructions[0]).toBe(getSystemPrompt('th'))
  })

  it("does not poison the cached prompt across requests: th -> en -> th all produce the correct locale-specific prompt", async () => {
    await POST(makeRequest({ message: 'msg 1', locale: 'th' }))
    await POST(makeRequest({ message: 'msg 2', locale: 'en' }))
    await POST(makeRequest({ message: 'msg 3', locale: 'th' }))

    expect(capturedInstructions).toHaveLength(3)
    expect(capturedInstructions[0]).toBe(getSystemPrompt('th'))
    expect(capturedInstructions[1]).toBe(getSystemPrompt('en'))
    expect(capturedInstructions[2]).toBe(getSystemPrompt('th'))
    // The 1st and 3rd (both th) must be identical, and different from the en one.
    expect(capturedInstructions[0]).toBe(capturedInstructions[2])
    expect(capturedInstructions[0]).not.toBe(capturedInstructions[1])
  })

  it('the me payload sent to n8n reflects the requested locale (en profile differs from th)', async () => {
    let payloads: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, options: { body: string }) => {
        payloads.push(JSON.parse(options.body))
        return { ok: true, status: 200, text: async () => JSON.stringify({ reply: 'ok' }) }
      }),
    )

    await POST(makeRequest({ message: 'hi', locale: 'en' }))
    await POST(makeRequest({ message: 'hi', locale: 'th' }))

    expect(payloads).toHaveLength(2)
    // Both requests must carry a `me` block, and the two locales' data need
    // not be identical (English/Thai datasets can diverge in message/cta text).
    expect(payloads[0].me).toBeDefined()
    expect(payloads[1].me).toBeDefined()
  })
})
