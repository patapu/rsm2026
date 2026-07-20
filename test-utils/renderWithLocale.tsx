/**
 * Shared test helper for components that call `useLocale()`.
 *
 * Wraps `ui` in a real `<LocaleProvider>` so a test exercises the actual
 * context (locale switching, `t()`, `me`) instead of relying on
 * `useLocale()`'s outside-a-Provider default. Most existing section/page
 * tests don't need this — `useLocale()` already falls back to real th-locale
 * data — but anything that needs a *specific* locale (English-locale
 * assertions) or that tests `setLocale`/`LanguageSwitcher` behavior does.
 *
 * `next/navigation`'s `useRouter` is mocked here because `LocaleProvider`
 * calls `router.refresh()` from `setLocale`, and there's no app-router
 * context available in jsdom tests. `vi.mock` calls are hoisted above this
 * file's own imports (Vitest transforms every file in the module graph, not
 * just test entry files), so importing this helper before anything else
 * that reaches `next/navigation` is enough to intercept it safely.
 */
import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement } from "react"
import { vi } from "vitest"

const mockRouter = {
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}))

import LocaleProvider from "@/components/i18n/LocaleProvider"
import type { Locale } from "@/lib/i18n"

export { mockRouter }

/**
 * Renders `ui` inside `<LocaleProvider initialLocale={locale}>`.
 * Defaults to `'en'` (the site default) when `locale` is omitted.
 */
export function renderWithLocale(
  ui: ReactElement,
  locale: Locale = "en",
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(<LocaleProvider initialLocale={locale}>{ui}</LocaleProvider>, options)
}
