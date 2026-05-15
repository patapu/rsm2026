/**
 * Shared resume section registry — consumed by the resume page and RightSidebar.
 */

export interface ResumeSection {
  id: string
  label: string
}

export const RESUME_SECTIONS: ResumeSection[] = [
  { id: "hero", label: "Introduction" },
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "hobbies", label: "Hobbies" },
]
