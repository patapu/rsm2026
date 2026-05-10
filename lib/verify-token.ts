/**
 * lib/verify-token.ts — Token verification (Edge-compatible)
 * Requirements: 9.2, 16.4
 *
 * This module is intentionally free of Node.js-only imports (like 'crypto')
 * so it can be safely used in Edge Runtime (e.g. middleware.ts).
 */

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
