"use client"

import { useLocale } from "./LocaleProvider"
import type { Locale } from "@/lib/i18n"

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: "th", label: "TH" },
  { locale: "en", label: "EN" },
]

/**
 * Compact TH | EN toggle. This is a mutually-exclusive two-option choice, so
 * it uses the `radiogroup`/`radio` idiom (`aria-checked` per option) rather
 * than a toggle-button group, and remains fully keyboard-operable (plain
 * `<button>`s).
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex items-center gap-1 font-mono text-xs"
      data-testid="language-switcher"
    >
      {OPTIONS.map(({ locale: optionLocale, label }) => {
        const active = locale === optionLocale
        return (
          <button
            key={optionLocale}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`language-switcher-${optionLocale}`}
            onClick={() => setLocale(optionLocale)}
            className={`px-2 py-0.5 rounded transition-colors tracking-wider ${
              active
                ? "text-[#00FFFF] font-bold neon-text-cyan bg-[rgba(0,255,255,0.1)] border border-[#00FFFF]"
                : "text-[#FF00FF]/70 border border-transparent hover:text-[#FF00FF] hover:border-[rgba(255,0,255,0.3)]"
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
