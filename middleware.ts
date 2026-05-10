/**
 * middleware.ts — Security middleware for /api/* routes (Edge Runtime)
 * Requirements: 14.1, 14.2, 14.3, 18.1, 18.2, 18.5, 18.8, 18.9, 18.10
 *
 * Strict check order:
 *   1. Pentest path  → 403
 *   2. Pentest UA    → 403
 *   3. Cookie guard  → 401 (only for /api/chat)
 *
 * NOTE: IP blacklist check moved to route handlers (Edge Runtime cannot use ioredis).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/verify-token'

// ──────────────────────────────────────────
//  Suspicious paths to block (normalized, lowercase)
// ──────────────────────────────────────────

const PENTEST_PATHS = [
  '/.env',
  '/.git',
  '/wp-admin',
  '/phpinfo',
  '/admin',
  '/etc/passwd',
]

// ──────────────────────────────────────────
//  Pentest tool UA substrings (lowercase)
// ──────────────────────────────────────────

const PENTEST_UA_PATTERNS = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'dirbuster']

// ──────────────────────────────────────────
//  Helper: isPentestPath
// ──────────────────────────────────────────

/**
 * Returns true if the pathname matches or is a variation of a suspicious path.
 * Handles: case variations, URL-encoded variants, trailing slashes.
 */
export function isPentestPath(pathname: string): boolean {
  // Normalize: decode URL encoding, lowercase, remove trailing slash(es)
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // If decoding fails, use the raw pathname
    decoded = pathname
  }
  const normalized = decoded.toLowerCase().replace(/\/+$/, '') || '/'

  return PENTEST_PATHS.some(
    (p) =>
      normalized === p ||
      normalized.startsWith(p + '/') ||
      normalized.startsWith(p + '.'),
  )
}

// ──────────────────────────────────────────
//  Helper: isPentestUA
// ──────────────────────────────────────────

/**
 * Returns true if the User-Agent string contains a pentest tool name substring
 * (case-insensitive).
 */
export function isPentestUA(ua: string): boolean {
  const lower = ua.toLowerCase()
  return PENTEST_UA_PATTERNS.some((pattern) => lower.includes(pattern))
}

// ──────────────────────────────────────────
//  Middleware
// ──────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const ua = req.headers.get('user-agent') ?? ''

  // ── 1. Pentest path check ──────────────────────────────────────────────────
  if (isPentestPath(pathname)) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Pentest UA check ────────────────────────────────────────────────────
  if (isPentestUA(ua)) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Cookie guard (only for /api/chat) ──────────────────────────────────
  if (pathname.startsWith('/api/chat')) {
    const token = req.cookies.get('fp_token')?.value
    if (!token || !verifyToken(token)) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  return NextResponse.next()
}

// ──────────────────────────────────────────
//  Matcher — run on all /api/* routes
// ──────────────────────────────────────────

export const config = {
  matcher: ['/api/:path*'],
}
