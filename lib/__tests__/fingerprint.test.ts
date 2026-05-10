/**
 * Tests for lib/fingerprint.ts
 * Covers: Property 3 (Fingerprint Determinism) and unit tests
 * Requirements: 9.1
 *
 * Note: FINGERPRINT_SECRET is set in vitest.setup.ts before module load.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { createVisitorId, verifyToken } from '../fingerprint'

// ──────────────────────────────────────────
//  Sub-task 2.1: Property 3 — Fingerprint Determinism
// ──────────────────────────────────────────

// Feature: resume-website, Property 3: Fingerprint Determinism
describe('Property 3: Fingerprint Determinism', () => {
  it('same (ua, lang, screenHint) always produces the same non-empty hex string', () => {
    // Validates: Requirements 9.1
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.string(),
        (ua, lang, screenHint) => {
          const secret = 'test-secret'
          const id1 = createVisitorId(ua, lang, screenHint, secret)
          const id2 = createVisitorId(ua, lang, screenHint, secret)
          return id1 === id2 && id1.length > 0
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ──────────────────────────────────────────
//  Sub-task 2.2: Unit tests for lib/fingerprint.ts
// ──────────────────────────────────────────

describe('createVisitorId', () => {
  const secret = 'my-test-secret'

  it('returns a non-empty hex string', () => {
    // Requirements: 9.1
    const result = createVisitorId('Mozilla/5.0', 'th-TH', '1920x1080', secret)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    // Should be a valid hex string
    expect(/^[0-9a-f]+$/.test(result)).toBe(true)
  })

  it('returns exactly 64 characters (SHA-256 hex output)', () => {
    const result = createVisitorId('Mozilla/5.0', 'en-US', '1280x720', secret)
    expect(result).toHaveLength(64)
  })

  it('different inputs produce different hashes', () => {
    // Requirements: 9.1
    const id1 = createVisitorId('Mozilla/5.0', 'th-TH', '1920x1080', secret)
    const id2 = createVisitorId('Chrome/100.0', 'en-US', '1280x720', secret)
    expect(id1).not.toBe(id2)
  })

  it('same inputs produce the same hash (determinism example)', () => {
    // Requirements: 9.1
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    const lang = 'th-TH'
    const screenHint = '1920x1080'
    const id1 = createVisitorId(ua, lang, screenHint, secret)
    const id2 = createVisitorId(ua, lang, screenHint, secret)
    expect(id1).toBe(id2)
  })

  it('different secrets produce different hashes for the same input', () => {
    const ua = 'Mozilla/5.0'
    const lang = 'en'
    const screenHint = '1024x768'
    const id1 = createVisitorId(ua, lang, screenHint, 'secret-a')
    const id2 = createVisitorId(ua, lang, screenHint, 'secret-b')
    expect(id1).not.toBe(id2)
  })

  it('handles empty string inputs without throwing', () => {
    expect(() => createVisitorId('', '', '', secret)).not.toThrow()
    const result = createVisitorId('', '', '', secret)
    expect(result).toHaveLength(64)
  })
})

describe('verifyToken', () => {
  it('returns true for a valid 64-char lowercase hex string', () => {
    // A real HMAC-SHA256 output
    const validToken = createVisitorId('Mozilla/5.0', 'th-TH', '1920x1080', 'secret')
    expect(verifyToken(validToken)).toBe(true)
  })

  it('returns true for any 64-char lowercase hex string', () => {
    const token = 'a'.repeat(64)
    expect(verifyToken(token)).toBe(true)
  })

  it('returns false for an empty string', () => {
    expect(verifyToken('')).toBe(false)
  })

  it('returns false for a string shorter than 64 chars', () => {
    expect(verifyToken('abc123')).toBe(false)
    expect(verifyToken('a'.repeat(63))).toBe(false)
  })

  it('returns false for a string longer than 64 chars', () => {
    expect(verifyToken('a'.repeat(65))).toBe(false)
  })

  it('returns false for a string with uppercase hex characters', () => {
    expect(verifyToken('A'.repeat(64))).toBe(false)
  })

  it('returns false for a string with non-hex characters', () => {
    expect(verifyToken('g'.repeat(64))).toBe(false)
    expect(verifyToken('z'.repeat(64))).toBe(false)
    // 63 valid hex + 1 invalid
    expect(verifyToken('a'.repeat(63) + 'x')).toBe(false)
  })
})
