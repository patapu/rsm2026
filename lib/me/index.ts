/**
 * lib/me/index.ts — Validated ME singleton + helpers.
 * All consumers should import from `lib/me` (this module).
 */

import { MeDataSchema, type MeData } from './schema'
import { rawMeData } from './data'

// Re-export schemas + types so consumers have a single import surface.
export * from './schema'

// ──────────────────────────────────────────
//  Validated ME singleton
// ──────────────────────────────────────────

/**
 * Parsed, validated resume data. Parse happens at module load so schema
 * violations fail fast at build/startup rather than surfacing at render time.
 */
export const ME: MeData = MeDataSchema.parse(rawMeData)

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const

/**
 * Builds the "available from" message shown on the contact page.
 *
 * `now` is a required parameter so the function is deterministic and testable.
 * Callers decide where "now" comes from (e.g., `new Date()` on the client after
 * hydration) to avoid server/client hydration mismatches around midnight.
 */
export function getAvailableMessage(now: Date): string {
  const target = new Date(
    now.getFullYear(),
    now.getMonth() + ME.cta.availableMonthsFromNow,
    1,
  )
  const monthName = THAI_MONTHS[target.getMonth()]
  const year = target.getFullYear()
  return `กำลังเปิดรับโอกาสใหม่ — พร้อมเริ่มงานภายใน${monthName} ${year}`
}
