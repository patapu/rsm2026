/**
 * Property-based test: Error status code mapping (Property 5)
 * Validates: Requirements 3.10
 *
 * Called with no explicit locale, so these exercise DEFAULT_LOCALE (English):
 * for any status 429 → "quickly" substring;
 * 500-599 → "wrong" substring;
 * Any other status → null.
 */
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock browser-only dependencies to allow importing from "use client" module
vi.mock('@heroui/react', () => ({
  Input: 'input',
  Button: 'button',
}))
vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
}))
vi.mock('../ChatMessage', () => ({
  default: () => null,
}))

import { getErrorMessage } from '../ChatInterface'

describe('Feature: heroui-chat-layout, Property 5: Error status code mapping', () => {
  it('status 429 returns message containing "quickly" (default locale is English)', () => {
    fc.assert(
      fc.property(fc.constant(429), (status) => {
        const result = getErrorMessage(status)
        expect(result).not.toBeNull()
        expect(result).toContain('quickly')
      }),
      { numRuns: 100 }
    )
  })

  it('status 500-599 returns message containing "wrong" (default locale is English)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 599 }), (status) => {
        const result = getErrorMessage(status)
        expect(result).not.toBeNull()
        expect(result).toContain('wrong')
      }),
      { numRuns: 100 }
    )
  })

  it('status codes other than 429 and 500-599 return null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 599 }).filter((n) => n !== 429 && (n < 500 || n > 599)),
        (status) => {
          const result = getErrorMessage(status)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Feature: i18n-th-en-switcher — getErrorMessage locale param', () => {
  it("defaults to English when locale is omitted (matches explicit 'en')", () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 599 }), (status) => {
        expect(getErrorMessage(status)).toBe(getErrorMessage(status, 'en'))
      }),
      { numRuns: 100 }
    )
  })

  it("status 429 with locale='en' returns an English message (not Thai)", () => {
    fc.assert(
      fc.property(fc.constant(429), (status) => {
        const result = getErrorMessage(status, 'en')
        expect(result).not.toBeNull()
        expect(result).toContain('quickly')
        expect(result).not.toContain('บ่อยเกินไป')
      }),
      { numRuns: 10 }
    )
  })

  it("status 500-599 with locale='en' returns an English generic error message", () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 599 }), (status) => {
        const result = getErrorMessage(status, 'en')
        expect(result).not.toBeNull()
        expect(result).toContain('wrong')
        expect(result).not.toContain('ลองใหม่ภายหลัง')
      }),
      { numRuns: 100 }
    )
  })

  it('status codes other than 429 and 500-599 return null regardless of locale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 599 }).filter((n) => n !== 429 && (n < 500 || n > 599)),
        fc.constantFrom('th', 'en'),
        (status, locale) => {
          expect(getErrorMessage(status, locale as 'th' | 'en')).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})
