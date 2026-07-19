/**
 * lib/i18n/server.ts — Server-only locale helper.
 *
 * Reads the locale cookie via `next/headers`. Import this ONLY from Server
 * Components / route handlers — `cookies()` is a Request-time API and will
 * error (or opt the route into dynamic rendering) if pulled into a Client
 * Component bundle. See:
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md
 */

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, parseLocale, type Locale } from './index'

/**
 * Resolves the visitor's locale from the incoming request's cookie.
 *
 * `cookies()` is an **async** function in this Next.js version (v15+/16) —
 * it must be awaited even though older Next versions allowed sync access.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return parseLocale(cookieStore.get(LOCALE_COOKIE)?.value)
}
