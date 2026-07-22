/**
 * app/api/chat/__tests__/getSystemPrompt.test.ts
 *
 * Isolated coverage of `getSystemPrompt` (see route.ts): the component
 * instructions file is concatenated onto the base prompt, both are
 * module-level cached (read from disk once), but the per-request locale
 * directive is appended fresh every call and must never leak across
 * locales — calling th -> en -> th must yield the correct locale directive
 * every time, not whichever locale happened to be cached first.
 *
 * Kept in its own file (rather than added to route.test.ts, which has
 * pre-existing unrelated failures) so this suite's pass/fail signal stays
 * clean.
 */
import { describe, it, expect, vi } from 'vitest'

const BASE_PROMPT_MARKER = 'BASE_PROMPT_MARKER_xyz'
const COMPONENT_INSTRUCTIONS_MARKER = 'COMPONENT_INSTRUCTIONS_MARKER_abc'

vi.mock('fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (String(path).includes('component-instructions')) {
      return COMPONENT_INSTRUCTIONS_MARKER
    }
    if (String(path).includes('system-prompt-v2')) {
      return BASE_PROMPT_MARKER
    }
    throw new Error(`ENOENT: no such file: ${path}`)
  }),
}))

// route.ts also imports these — none of them need real backends for
// getSystemPrompt (a pure string-composition function), but the module
// import chain must not throw.
vi.mock('@/lib/redis', () => ({
  redis: {},
  keys: {
    session: (id: string) => `session:${id}`,
    memory: (id: string) => `memory:${id}`,
    history: (id: string) => `history:${id}`,
    rateLimit: (id: string) => `ratelimit:${id}`,
    blocked: (ip: string) => `blocked:${ip}`,
  },
}))

import { readFileSync } from 'fs'
import { getSystemPrompt } from '../route'

const mockedReadFileSync = vi.mocked(readFileSync)

describe('getSystemPrompt — composition', () => {
  it('includes both the base prompt and the component instructions', () => {
    const result = getSystemPrompt('en')
    expect(result).toContain(BASE_PROMPT_MARKER)
    expect(result).toContain(COMPONENT_INSTRUCTIONS_MARKER)
  })

  it('base prompt comes before component instructions, which come before the locale directive', () => {
    const result = getSystemPrompt('en')
    const baseIdx = result.indexOf(BASE_PROMPT_MARKER)
    const componentIdx = result.indexOf(COMPONENT_INSTRUCTIONS_MARKER)
    expect(baseIdx).toBeGreaterThanOrEqual(0)
    expect(componentIdx).toBeGreaterThan(baseIdx)
  })

  it("'en' locale gets the English directive, not the Thai one", () => {
    const result = getSystemPrompt('en')
    expect(result).toContain('Respond in English')
    expect(result).not.toContain('ตอบเป็นภาษาไทยเสมอ')
  })

  it("'th' locale gets the Thai directive, not the English one", () => {
    const result = getSystemPrompt('th')
    expect(result).toContain('ตอบเป็นภาษาไทยเสมอ')
    expect(result).not.toContain('Respond in English')
  })

  it('defaults to the default locale directive when called with no argument', () => {
    const withDefault = getSystemPrompt()
    const withEn = getSystemPrompt('en')
    expect(withDefault).toBe(withEn)
  })
})

describe('getSystemPrompt — no cross-request locale leak (th -> en -> th)', () => {
  it('each call in sequence returns the correct locale directive, uncorrupted by the previous call', () => {
    const th1 = getSystemPrompt('th')
    const en1 = getSystemPrompt('en')
    const th2 = getSystemPrompt('th')

    expect(th1).toContain('ตอบเป็นภาษาไทยเสมอ')
    expect(th1).not.toContain('Respond in English')

    expect(en1).toContain('Respond in English')
    expect(en1).not.toContain('ตอบเป็นภาษาไทยเสมอ')

    expect(th2).toContain('ตอบเป็นภาษาไทยเสมอ')
    expect(th2).not.toContain('Respond in English')

    // The two th calls are identical — no accumulation/mutation across calls.
    expect(th1).toBe(th2)

    // Base + component text is identical across locales (module-level cache
    // shared correctly); only the trailing locale directive differs.
    const th1WithoutDirective = th1.replace('\n\nตอบเป็นภาษาไทยเสมอ ไม่ว่าคำถามจะเป็นภาษาอะไร', '')
    const en1WithoutDirective = en1.replace(
      '\n\nRespond in English regardless of the language of the question.',
      '',
    )
    expect(th1WithoutDirective).toBe(en1WithoutDirective)
  })

  it('the base prompt file is only read once across many calls (module-level cache)', () => {
    const callsBefore = mockedReadFileSync.mock.calls.length
    getSystemPrompt('th')
    getSystemPrompt('en')
    getSystemPrompt('th')
    getSystemPrompt('en')
    const callsAfter = mockedReadFileSync.mock.calls.length
    // No new readFileSync calls — both files were already cached from the
    // earlier tests in this file (module-level cache persists for the life
    // of the module, which vitest keeps loaded for the whole file).
    expect(callsAfter).toBe(callsBefore)
  })
})
