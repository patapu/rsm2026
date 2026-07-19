"use client"

import { RESUME_SECTIONS } from "./sections"
import { useActiveSection } from "./useActiveSection"
import { useLocale } from "@/components/i18n/LocaleProvider"

const SECTION_IDS = RESUME_SECTIONS.map((s) => s.id)

export default function RightSidebar() {
  const activeSection = useActiveSection(SECTION_IDS)
  const { t } = useLocale()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <aside aria-label={t("resume.onThisPage")}>
      <p className="text-xs font-semibold text-foreground-500 uppercase mb-3 pl-2">
        {t("resume.onThisPage")}
      </p>
      <nav className="space-y-1 pl-2 border-l border-divider">
        {RESUME_SECTIONS.map(({ id, labelKey }) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={`block w-full text-left text-sm py-1 px-2 transition-colors ${
              activeSection === id
                ? "text-[#00FFFF] font-mono font-medium border-l-2 border-[#00FFFF] neon-text-cyan -ml-[1px]"
                : "text-foreground-500 font-mono hover:text-[#00FFFF] transition-colors"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </nav>
    </aside>
  )
}
