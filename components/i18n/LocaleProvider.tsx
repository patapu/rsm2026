"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  getMeForLocale,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n"
import type { MeData } from "@/lib/me"

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  me: MeData
}

// `null` default — the real th-locale default value below (in `useLocale`)
// is built lazily, at hook-call time, rather than here at module-evaluation
// time. Calling `getMeForLocale(DEFAULT_LOCALE)` eagerly as the `createContext`
// argument would touch `@/lib/me` the instant this module is imported, which
// runs *before* any later top-level statement in an importing test file (ES
// module import evaluation happens before the rest of the module body) — a
// test that builds its `@/lib/me` mock data with `const mockX = {...}` placed
// after its `vi.mock('@/lib/me', ...)` call would hit a TDZ ReferenceError
// the moment anything imports a component that (transitively) imports this
// module. Deferring the computation to `useLocale()` keeps the same "real
// data, no Provider required" guarantee for components rendered in isolation,
// without the import-time side effect.
const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * Writes the locale cookie from the browser. `Secure` is only appended when
 * the page is served over HTTPS — an unconditionally `Secure` cookie is
 * silently dropped on the plain-HTTP deploys this site also runs on.
 */
function writeLocaleCookie(locale: Locale) {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secure}`
}

interface LocaleProviderProps {
  /**
   * Initial locale resolved server-side (from the cookie, via
   * `lib/i18n/server.ts`) and passed down as a prop. Avoids initializing
   * from `document.cookie` in a `useEffect`, which would cause a hydration
   * mismatch / flash of the wrong language.
   */
  initialLocale: Locale
  children: React.ReactNode
}

export default function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const router = useRouter()

  const setLocale = useCallback(
    (next: Locale) => {
      writeLocaleCookie(next)
      setLocaleState(next)
      // Re-resolve server-rendered bits (metadata, `html lang`) for the new locale.
      router.refresh()
    },
    [router],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      me: getMeForLocale(locale),
    }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * Reads the current locale, translation function, and locale-appropriate
 * resume data from context. Falls back to a real (not thrown-away) th-locale
 * default when called outside a `<LocaleProvider>` ancestor — e.g. component
 * tests that mount a single section in isolation.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (ctx) return ctx
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, params) => translate(DEFAULT_LOCALE, key, params),
    me: getMeForLocale(DEFAULT_LOCALE),
  }
}
