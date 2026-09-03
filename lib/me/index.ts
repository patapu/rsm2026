/**
 * lib/me/index.ts — Validated ME singleton + helpers.
 * All consumers should import from `lib/me` (this module).
 */

import { MeDataSchema, type MeData } from './schema'
import { rawMeData } from './data'
import { rawMeDataEn } from './data.en'

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

/**
 * Parsed, validated English resume data — used to render the English CV PDF.
 */
export const ME_EN: MeData = MeDataSchema.parse(rawMeDataEn)

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
] as const

// Deliberately not imported from `lib/i18n` — that module imports `ME`/`ME_EN`
// from this file, and importing `Locale` back from there would create a
// circular dependency. The literal union is structurally identical.
type AvailableMessageLocale = 'th' | 'en'

/**
 * Builds the "available from" message shown on the contact page, localized
 * for `locale` (defaults to `'en'` so existing callers are unaffected).
 *
 * The literal default below can't import `DEFAULT_LOCALE` from `lib/i18n`
 * without creating the same circular dependency noted above — `lib/i18n` is
 * the source of truth for the site default; keep this literal in sync with it.
 *
 * `now` is a required parameter so the function is deterministic and testable.
 * Callers decide where "now" comes from (e.g., `new Date()` on the client after
 * hydration) to avoid server/client hydration mismatches around midnight.
 */
export function getAvailableMessage(now: Date, locale: AvailableMessageLocale = 'en'): string {
  const cta = locale === 'en' ? ME_EN.cta : ME.cta
  const target = new Date(now.getFullYear(), now.getMonth() + cta.availableMonthsFromNow, 1)
  const year = target.getFullYear()

  if (locale === 'en') {
    const monthName = ENGLISH_MONTHS[target.getMonth()]
    return `Open to new opportunities, available from ${monthName} ${year}`
  }

  const monthName = THAI_MONTHS[target.getMonth()]
  return `กำลังเปิดรับโอกาสใหม่ พร้อมเริ่มงานภายใน${monthName} ${year}`
}
