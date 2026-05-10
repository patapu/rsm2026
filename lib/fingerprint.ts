/**
 * lib/fingerprint.ts — HMAC-SHA256 visitor fingerprinting
 * Requirements: 9.1, 9.2, 16.4, 16.6
 */

import { createHmac } from 'crypto'

// ──────────────────────────────────────────
//  Module-load env var validation
// ──────────────────────────────────────────

if (!process.env.FINGERPRINT_SECRET) {
  throw new Error('FINGERPRINT_SECRET environment variable is required')
}

// ──────────────────────────────────────────
//  createVisitorId
// ──────────────────────────────────────────

/**
 * Creates a deterministic visitor ID using HMAC-SHA256.
 * The same (ua, lang, screenHint, secret) inputs always produce the same hex string.
 *
 * @param ua          - User-Agent string
 * @param lang        - navigator.language value
 * @param screenHint  - Screen dimensions hint (e.g. "1920x1080")
 * @param secret      - HMAC secret key
 * @returns 64-character lowercase hex string
 */
export function createVisitorId(
  ua: string,
  lang: string,
  screenHint: string,
  secret: string,
): string {
  const payload = `${ua}|${lang}|${screenHint}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// ──────────────────────────────────────────
//  verifyToken
// ──────────────────────────────────────────

/**
 * Verifies that a token has the correct format for a visitor ID:
 * a non-empty hex string of exactly 64 characters (SHA-256 output).
 *
 * @param token - The token string to validate
 * @returns true if the token is a valid 64-char hex string
 */
export function verifyToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  return /^[0-9a-f]{64}$/.test(token)
}
