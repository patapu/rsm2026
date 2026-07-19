/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for LocaleProvider / useLocale:
 *  - initialLocale prop is honored (locale + me resolve correctly)
 *  - t() falls back sanely on an unknown key
 *  - useLocale() outside a Provider still returns real th-locale data
 */
import { screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { renderWithLocale } from "@/test-utils/renderWithLocale"
import { render } from "@testing-library/react"
import { useLocale } from "../LocaleProvider"
import { ME, ME_EN } from "@/lib/me"
import type { MessageKey } from "@/lib/i18n"

function Consumer() {
  const { locale, me, t } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="firstName">{me.profile.firstName}</span>
      <span data-testid="nav-chat">{t("nav.chat")}</span>
      <span data-testid="unknown-key">{t("this.key.does.not.exist" as MessageKey)}</span>
    </div>
  )
}

describe("LocaleProvider", () => {
  it("honors initialLocale='th': locale, me, and t() all resolve to Thai", () => {
    renderWithLocale(<Consumer />, "th")

    expect(screen.getByTestId("locale").textContent).toBe("th")
    expect(screen.getByTestId("firstName").textContent).toBe(ME.profile.firstName)
    expect(screen.getByTestId("nav-chat").textContent).toBe("แชท")
  })

  it("honors initialLocale='en': locale, me, and t() all resolve to English", () => {
    renderWithLocale(<Consumer />, "en")

    expect(screen.getByTestId("locale").textContent).toBe("en")
    expect(screen.getByTestId("firstName").textContent).toBe(ME_EN.profile.firstName)
    expect(screen.getByTestId("nav-chat").textContent).toBe("Chat")
  })

  it("t() falls back sanely (the key itself, not a crash or blank) on an unknown key", () => {
    renderWithLocale(<Consumer />, "en")

    expect(screen.getByTestId("unknown-key").textContent).toBe("this.key.does.not.exist")
  })

  it("clicking a LanguageSwitcher-equivalent setLocale call re-renders consumers with the new locale", () => {
    function SwitchingConsumer() {
      const { locale, setLocale } = useLocale()
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <button data-testid="switch" onClick={() => setLocale("en")}>
            switch
          </button>
        </div>
      )
    }

    renderWithLocale(<SwitchingConsumer />, "th")
    expect(screen.getByTestId("locale").textContent).toBe("th")

    fireEvent.click(screen.getByTestId("switch"))

    expect(screen.getByTestId("locale").textContent).toBe("en")
  })

  it("useLocale() outside any <LocaleProvider> still returns real th-locale data (no throw)", () => {
    expect(() => render(<Consumer />)).not.toThrow()
    expect(screen.getByTestId("locale").textContent).toBe("th")
    expect(screen.getByTestId("firstName").textContent).toBe(ME.profile.firstName)
  })
})
