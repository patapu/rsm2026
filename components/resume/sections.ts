/**
 * Shared resume section registry — consumed by the resume page and RightSidebar.
 *
 * Labels are i18n dictionary keys (not literal strings) so this stays a
 * stable, locale-independent module-level array — consumers resolve the
 * display label at render time via `useLocale().t(labelKey)`. Section `id`s
 * are stable across locales; `useActiveSection.ts` and the anchor scroll
 * depend on them.
 */

import type { MessageKey } from "@/lib/i18n"

export interface ResumeSection {
  id: string
  labelKey: MessageKey
}

export const RESUME_SECTIONS: ResumeSection[] = [
  { id: "hero", labelKey: "sections.introduction" },
  { id: "summary", labelKey: "sections.summary" },
  { id: "skills", labelKey: "sections.skills" },
  { id: "experience", labelKey: "sections.experience" },
  { id: "projects", labelKey: "sections.projects" },
  { id: "education", labelKey: "sections.education" },
  { id: "hobbies", labelKey: "sections.hobbies" },
]
