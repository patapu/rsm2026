/**
 * Property-based test: Error status code mapping (Property 5)
 * Validates: Requirements 3.10
 *
 * For any status 429 → "ส่งบ่อยเกินไป" substring;
 * 500-599 → "ลองใหม่ภายหลัง" substring;
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
  it('status 429 returns message containing "บ่อยเกินไป"', () => {
    fc.assert(
      fc.property(fc.constant(429), (status) => {
        const result = getErrorMessage(status)
        expect(result).not.toBeNull()
        expect(result).toContain('บ่อยเกินไป')
      }),
      { numRuns: 100 }
    )
  })

  it('status 500-599 returns message containing "ลองใหม่ภายหลัง"', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 599 }), (status) => {
        const result = getErrorMessage(status)
        expect(result).not.toBeNull()
        expect(result).toContain('ลองใหม่ภายหลัง')
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
