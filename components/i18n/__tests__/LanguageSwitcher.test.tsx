/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for LanguageSwitcher — renders both options, marks the active
 * one accessibly (aria-checked via the radiogroup/radio idiom), and
 * switches locale on activation.
 */
import { screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { renderWithLocale } from "@/test-utils/renderWithLocale"
import LanguageSwitcher from "../LanguageSwitcher"

describe("LanguageSwitcher", () => {
  it("renders both TH and EN options", () => {
    renderWithLocale(<LanguageSwitcher />)

    expect(screen.getByTestId("language-switcher-th")).toBeTruthy()
    expect(screen.getByTestId("language-switcher-en")).toBeTruthy()
    expect(screen.getByTestId("language-switcher-th").textContent).toBe("TH")
    expect(screen.getByTestId("language-switcher-en").textContent).toBe("EN")
  })

  it("exposes a role=radiogroup with an accessible label", () => {
    renderWithLocale(<LanguageSwitcher />)
    const group = screen.getByRole("radiogroup", { name: "Language" })
    expect(group).toBeTruthy()
  })

  it("marks TH as the active option (aria-checked) when initial locale is 'th'", () => {
    renderWithLocale(<LanguageSwitcher />, "th")

    expect(screen.getByTestId("language-switcher-th").getAttribute("aria-checked")).toBe("true")
    expect(screen.getByTestId("language-switcher-en").getAttribute("aria-checked")).toBe("false")
  })

  it("marks EN as the active option (aria-checked) when initial locale is 'en'", () => {
    renderWithLocale(<LanguageSwitcher />, "en")

    expect(screen.getByTestId("language-switcher-en").getAttribute("aria-checked")).toBe("true")
    expect(screen.getByTestId("language-switcher-th").getAttribute("aria-checked")).toBe("false")
  })

  it("each option has role=radio", () => {
    renderWithLocale(<LanguageSwitcher />, "th")

    expect(screen.getByTestId("language-switcher-th").getAttribute("role")).toBe("radio")
    expect(screen.getByTestId("language-switcher-en").getAttribute("role")).toBe("radio")
  })

  it("clicking the EN option switches the active option to EN", () => {
    renderWithLocale(<LanguageSwitcher />, "th")

    fireEvent.click(screen.getByTestId("language-switcher-en"))

    expect(screen.getByTestId("language-switcher-en").getAttribute("aria-checked")).toBe("true")
    expect(screen.getByTestId("language-switcher-th").getAttribute("aria-checked")).toBe("false")
  })

  it("clicking the already-active option is a no-op (stays active)", () => {
    renderWithLocale(<LanguageSwitcher />, "th")

    fireEvent.click(screen.getByTestId("language-switcher-th"))

    expect(screen.getByTestId("language-switcher-th").getAttribute("aria-checked")).toBe("true")
  })

  it("options are real <button> elements, so Enter/Space activate them per native HTML semantics", () => {
    renderWithLocale(<LanguageSwitcher />, "th")

    const enOption = screen.getByTestId("language-switcher-en")
    expect(enOption.tagName).toBe("BUTTON")
    expect(enOption.getAttribute("type")).toBe("button")

    // jsdom does not run a real browser's default keyboard-activation
    // behavior for buttons, so we simulate what Enter/Space produces on a
    // focused native <button> (a click event) directly.
    enOption.focus()
    expect(document.activeElement).toBe(enOption)
    fireEvent.click(enOption)

    expect(enOption.getAttribute("aria-checked")).toBe("true")
  })
})
