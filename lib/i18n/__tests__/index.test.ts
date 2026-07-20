/**
 * Unit tests for lib/i18n — dictionary completeness, locale->data resolver,
 * translate() interpolation and its unknown-key fallback.
 */
import { describe, it, expect } from "vitest"
import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  messages,
  translate,
  getMeForLocale,
  parseLocale,
  type MessageKey,
} from "../index"
import { ME, ME_EN } from "@/lib/me"

describe("lib/i18n dictionary completeness", () => {
  it("th and en dictionaries have exactly the same key set", () => {
    const enKeys = Object.keys(messages.en).sort()
    const thKeys = Object.keys(messages.th).sort()
    expect(thKeys).toEqual(enKeys)
  })

  it("every key has a non-empty string value in both locales", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(messages[locale])) {
        expect(typeof value, `${locale}.${key} should be a string`).toBe("string")
        expect(value.length, `${locale}.${key} should not be empty`).toBeGreaterThan(0)
      }
    }
  })

  it("LOCALES contains exactly 'th' and 'en'", () => {
    expect([...LOCALES].sort()).toEqual(["en", "th"])
  })

  it("DEFAULT_LOCALE is 'en'", () => {
    expect(DEFAULT_LOCALE).toBe("en")
  })

  it("LOCALE_COOKIE is a stable, non-empty cookie name", () => {
    expect(LOCALE_COOKIE).toBe("locale")
  })
})

describe("getMeForLocale", () => {
  it("returns the Thai dataset for 'th'", () => {
    expect(getMeForLocale("th")).toBe(ME)
  })

  it("returns the English dataset for 'en'", () => {
    expect(getMeForLocale("en")).toBe(ME_EN)
  })

  it("th and en datasets are distinct objects", () => {
    expect(getMeForLocale("th")).not.toBe(getMeForLocale("en"))
  })
})

describe("parseLocale", () => {
  it("narrows the literal string 'en' to 'en'", () => {
    expect(parseLocale("en")).toBe("en")
  })

  // Regression guard for the DEFAULT_LOCALE-flip trap: an explicit 'th'
  // cookie must round-trip to 'th' even though 'en' is now the default —
  // parseLocale must not collapse every non-'en' value onto DEFAULT_LOCALE.
  it("narrows the literal string 'th' to 'th' (not DEFAULT_LOCALE)", () => {
    expect(parseLocale("th")).toBe("th")
  })

  it("falls back to DEFAULT_LOCALE for undefined/null/garbage input", () => {
    expect(parseLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(parseLocale(null)).toBe(DEFAULT_LOCALE)
    expect(parseLocale("fr")).toBe(DEFAULT_LOCALE)
    expect(parseLocale("")).toBe(DEFAULT_LOCALE)
  })

  it("parseLocale('th') === 'th' and parseLocale('en') === 'en' and parseLocale(undefined) === DEFAULT_LOCALE", () => {
    expect(parseLocale("th")).toBe("th")
    expect(parseLocale("en")).toBe("en")
    expect(parseLocale(undefined)).toBe(DEFAULT_LOCALE)
  })
})

describe("translate", () => {
  it("returns the th string for a known key", () => {
    expect(translate("th", "nav.chat")).toBe(messages.th["nav.chat"])
  })

  it("returns the en string for a known key", () => {
    expect(translate("en", "nav.chat")).toBe(messages.en["nav.chat"])
  })

  it("interpolates a {token} placeholder from params", () => {
    expect(translate("en", "hobbies.frequencyLabel", { n: 3 })).toBe("Frequency 3 of 5")
    expect(translate("th", "hobbies.frequencyLabel", { n: 3 })).toBe("ความถี่ 3 จาก 5")
  })

  it("leaves a placeholder untouched if the param is missing", () => {
    expect(translate("en", "hobbies.frequencyLabel", {})).toBe("Frequency {n} of 5")
  })

  it("falls back to the key itself for an unknown key instead of throwing or returning undefined", () => {
    const result = translate("en", "bogus.unknown.key" as MessageKey)
    expect(result).toBe("bogus.unknown.key")
  })

  it("does not throw when params are supplied alongside an unknown key", () => {
    expect(() =>
      translate("th", "bogus.unknown.key" as MessageKey, { n: 1 }),
    ).not.toThrow()
  })
})
