"use client"

import { RESUME_SECTIONS } from "./sections"
import { useActiveSection } from "./useActiveSection"

const SECTION_IDS = RESUME_SECTIONS.map((s) => s.id)

export default function RightSidebar() {
  const activeSection = useActiveSection(SECTION_IDS)

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <aside aria-label="On this page">
      <p className="text-xs font-semibold text-foreground-500 uppercase mb-3 pl-2">
        On this page
      </p>
      <nav className="space-y-1 pl-2 border-l border-divider">
        {RESUME_SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={`block w-full text-left text-sm py-1 px-2 transition-colors ${
              activeSection === id
                ? "text-primary font-medium border-l-2 border-primary -ml-[1px]"
                : "text-foreground-500 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
