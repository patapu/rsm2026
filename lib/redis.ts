/**
 * lib/redis.ts — ioredis singleton + key helpers
 * Requirements: 16.2, 16.6
 */

import Redis from 'ioredis'

// ──────────────────────────────────────────
//  Module-load env var validation
// ──────────────────────────────────────────

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required')
}

// ──────────────────────────────────────────
//  Redis singleton
// ──────────────────────────────────────────

export const redis = new Redis(process.env.REDIS_URL)

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

  /** Rate limit counter: `ratelimit:{visitorId}` — TTL 1 min */
  rateLimit: (visitorId: string) => `ratelimit:${visitorId}`,

  /** IP blacklist flag: `blocked:{ip}` — TTL 1h */
  blocked: (ip: string) => `blocked:${ip}`,
}
