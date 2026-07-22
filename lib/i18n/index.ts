/**
 * lib/i18n/index.ts — Locale core: types, constants, the UI string dictionary,
 * and the locale -> resume-data resolver.
 *
 * Safe to import from both Server and Client Components — this file does NOT
 * import `next/headers`. The cookie-reading helper used in Server Components
 * lives in `lib/i18n/server.ts` so client bundles never pull it in.
 */

import { ME, ME_EN, type MeData } from '@/lib/me'

// ──────────────────────────────────────────
//  Locale
// ──────────────────────────────────────────

export type Locale = 'th' | 'en'

export const LOCALES: Locale[] = ['th', 'en']

export const DEFAULT_LOCALE: Locale = 'en'

/** Cookie name used to persist the visitor's chosen locale. */
export const LOCALE_COOKIE = 'locale'

/** ~1 year, in seconds — used for both the client-set and (if ever added) server-set cookie. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * Returns the validated resume dataset for a given locale.
 */
export function getMeForLocale(locale: Locale): MeData {
  return locale === 'en' ? ME_EN : ME
}

/**
 * Narrows an arbitrary string (e.g. a raw cookie value) to a known `Locale`,
 * falling back to `DEFAULT_LOCALE` for anything else (missing cookie,
 * tampered value, etc.).
 *
 * Checks membership in `LOCALES` explicitly rather than comparing against a
 * single known value — both `'th'` and `'en'` must round-trip unchanged, so
 * an explicit locale cookie is never silently overridden by whichever locale
 * happens to be the default.
 */
export function parseLocale(value: string | undefined | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE
}

// ──────────────────────────────────────────
//  UI string dictionary
// ──────────────────────────────────────────

/**
 * English strings are the source of truth for the key set. `th` below must
 * satisfy the exact same keys — a missing Thai translation is a TypeScript
 * error, not a silent fallback to English.
 */
const en = {
  'nav.chat': 'Chat',
  'nav.resume': 'Resume',
  'nav.contact': 'Contact',

  'sections.introduction': 'Introduction',
  'sections.summary': 'Summary',
  'sections.skills': 'Skills',
  'sections.experience': 'Experience',
  'sections.projects': 'Projects',
  'sections.education': 'Education',
  'sections.hobbies': 'Hobbies',

  'hobbies.frequencyLabel': 'Frequency {n} of 5',

  'resume.onThisPage': 'On this page',

  'experience.careerGrowth': 'Career Growth',
  'experience.responsibilities': 'Responsibilities',
  'experience.achievements': 'Achievements',
  'experience.clients': 'Clients',
  'experience.techStack': 'Tech Stack',

  'projects.role': 'Role:',
  'projects.repository': 'Repository',
  'projects.liveDemo': 'Live Demo',

  'education.coursesAndTraining': 'Courses & Training',
  'education.currentlyLearning': 'Currently Learning',

  'skills.languages': 'Languages',
  'skills.frameworks': 'Frameworks',
  'skills.databases': 'Databases',
  'skills.devops': 'DevOps',
  'skills.tools': 'Tools',
  'skills.softSkills': 'Soft Skills',

  'summary.yearsOfExperience': 'Years of Experience',

  'contact.title': 'Contact',
  'contact.email': 'Email',
  'contact.phone': 'Phone',
  'contact.downloadResume': 'Download Resume (PDF)',

  'chat.errorRateLimit': "You're sending messages too quickly. Please wait a moment.",
  'chat.errorGeneric': 'Something went wrong. Please try again later.',
  'chat.errorConnection': 'Unable to connect. Please try again.',
  'chat.emptyStateGreeting': 'Hi! Ask me anything about my experience or skills.',
  'chat.typingAriaLabel': 'Typing',
  'chat.inputPlaceholder': 'Type a message...',
  'chat.sendButton': 'Send',

  'chat.blocks.timelinePresent': 'Present',
} as const

export type MessageKey = keyof typeof en

const th: Record<MessageKey, string> = {
  'nav.chat': 'แชท',
  'nav.resume': 'เรซูเม่',
  'nav.contact': 'ติดต่อ',

  'sections.introduction': 'บทนำ',
  'sections.summary': 'สรุป',
  'sections.skills': 'ทักษะ',
  'sections.experience': 'ประสบการณ์',
  'sections.projects': 'โปรเจกต์',
  'sections.education': 'การศึกษา',
  'sections.hobbies': 'งานอดิเรก',

  'hobbies.frequencyLabel': 'ความถี่ {n} จาก 5',

  'resume.onThisPage': 'ในหน้านี้',

  'experience.careerGrowth': 'เส้นทางความก้าวหน้า',
  'experience.responsibilities': 'หน้าที่รับผิดชอบ',
  'experience.achievements': 'ผลงานความสำเร็จ',
  'experience.clients': 'ลูกค้า',
  'experience.techStack': 'เทคโนโลยีที่ใช้',

  'projects.role': 'บทบาท:',
  'projects.repository': 'ที่เก็บโค้ด',
  'projects.liveDemo': 'ดูตัวอย่างการใช้งาน',

  'education.coursesAndTraining': 'คอร์สเรียนและการฝึกอบรม',
  'education.currentlyLearning': 'กำลังเรียนรู้เพิ่มเติม',

  'skills.languages': 'ภาษาโปรแกรม',
  'skills.frameworks': 'เฟรมเวิร์ก',
  'skills.databases': 'ฐานข้อมูล',
  'skills.devops': 'DevOps',
  'skills.tools': 'เครื่องมือ',
  'skills.softSkills': 'ทักษะทางสังคม',

  'summary.yearsOfExperience': 'ปีประสบการณ์',

  'contact.title': 'ติดต่อ',
  'contact.email': 'อีเมล',
  'contact.phone': 'เบอร์โทร',
  'contact.downloadResume': 'ดาวน์โหลดเรซูเม่ (PDF)',

  'chat.errorRateLimit': 'คุณส่งข้อความบ่อยเกินไป กรุณารอสักครู่',
  'chat.errorGeneric': 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง',
  'chat.errorConnection': 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่',
  'chat.emptyStateGreeting': 'สวัสดีครับ! ถามอะไรเกี่ยวกับประสบการณ์หรือทักษะของผมได้เลย',
  'chat.typingAriaLabel': 'กำลังพิมพ์',
  'chat.inputPlaceholder': 'พิมพ์ข้อความ...',
  'chat.sendButton': 'ส่ง',

  'chat.blocks.timelinePresent': 'ปัจจุบัน',
}

export const messages: Record<Locale, Record<MessageKey, string>> = { en, th }

/**
 * Looks up a UI string for the given locale, interpolating `{token}`
 * placeholders from `params` (e.g. `translate('en', 'hobbies.frequencyLabel', { n: 5 })`).
 *
 * `MessageKey` restricts `key` to the known dictionary at compile time, but a
 * caller that received an unvalidated string at runtime (or a test exercising
 * that edge) could still pass a key with no entry. Falls back to the key
 * itself rather than returning `undefined` or throwing on `.replace`, so a
 * missing translation degrades to visible-but-harmless text instead of a
 * blank UI or a crash.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = messages[locale][key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    token in params ? String(params[token]) : `{${token}}`,
  )
}
