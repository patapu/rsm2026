/**
 * lib/redis.ts — ioredis singleton + key helpers
 * Requirements: 16.2, 16.6
 */

import Redis from 'ioredis'

// ──────────────────────────────────────────
//  Lazy Redis singleton
//
//  REDIS_URL is a RUNTIME secret, not a build-time variable. Connecting (or
//  throwing) at module-load time breaks `next build`, which statically imports
//  every API route handler to collect routes — that import chain reaches this
//  module and would fail before any request is ever served.
//
//  Instead we construct the client lazily on first property access. The env
//  check therefore runs only when a real request actually touches Redis.
// ──────────────────────────────────────────

let _client: Redis | null = null

function getClient(): Redis {
  if (!_client) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required')
    }
    _client = new Redis(process.env.REDIS_URL)
  }
  return _client
}

/**
 * Lazy proxy that behaves exactly like an ioredis instance but defers the real
 * connection until the first property/method access. Methods are bound to the
 * underlying client so ioredis's internal `this` stays correct.
 */
export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as Redis

// ──────────────────────────────────────────
//  Key helpers
// ──────────────────────────────────────────

export const keys = {
  /** Prompt version — bump this when system prompt changes to force new n8n sessions */
  _promptVersion: 'v2',

  /** Session data for a visitor: `session:{version}:{visitorId}` — TTL 24h */
  session: (visitorId: string) => `session:${keys._promptVersion}:${visitorId}`,

  /** User memory (interests, askedTopics): `memory:{visitorId}` — TTL 7 days */
  memory: (visitorId: string) => `memory:${visitorId}`,

  /** Chat history list: `chat:history:{visitorId}:{chatSessionId}` — TTL 24h, max 20 items */
  history: (visitorId: string, chatSessionId?: string) =>
    chatSessionId && chatSessionId !== 'default'
      ? `chat:history:${visitorId}:${chatSessionId}`
      : `chat:history:${visitorId}`,

  /** Rate limit counter: `ratelimit:{ip}:{visitorId}` (or `ratelimit:{visitorId}` when ip omitted) — TTL 1 min */
  rateLimit: (visitorId: string, ip?: string) =>
    ip ? `ratelimit:${ip}:${visitorId}` : `ratelimit:${visitorId}`,

  /** Fingerprint mint rate limit counter: `fp-mint:{ip}` — TTL 1h */
  fpMint: (ip: string) => `fp-mint:${ip}`,

  /** IP blacklist flag: `blocked:{ip}` — TTL 1h */
  blocked: (ip: string) => `blocked:${ip}`,
}
