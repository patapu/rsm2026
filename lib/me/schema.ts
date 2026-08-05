/**
 * lib/me/schema.ts — Zod schemas + inferred TypeScript types
 * Single source of truth for the shape of resume data.
 */

import { z } from 'zod'

// ──────────────────────────────────────────
//  Shared primitives
// ──────────────────────────────────────────

/**
 * YYYY-MM or the literal string "present" for ongoing roles.
 * Keeps data human-readable while enforcing format at parse time.
 */
const MonthYearOrPresent = z
  .string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2])|present)$/, {
    message: 'Expected YYYY-MM or "present"',
  })

/**
 * Phone string — international/local variants with digits, spaces, dashes,
 * parens, and an optional leading +. Must contain at least 7 digits total.
 */
const PhoneString = z
  .string()
  .refine(
    (s) => /^[+(\d]/.test(s) && (s.match(/\d/g)?.length ?? 0) >= 7,
    { message: 'Expected a phone number with at least 7 digits' },
  )

// ──────────────────────────────────────────
//  Zod schemas
// ──────────────────────────────────────────

export const ProfileSchema = z.object({
  firstName: z.string().min(1),
  firstNameTH: z.string().min(1),
  lastName: z.string().min(1),
  lastNameTH: z.string().min(1),
  nickname: z.string().optional(),
  nicknameTH: z.string().optional(),
  title: z.string().min(1),
  tagline: z.string().min(1),
  location: z.string().min(1),
  /** Personal details — used for job-portal profiles (JobsDB/JobThai), not rendered on the public site. */
  gender: z.enum(['male', 'female']).optional(),
  /** ISO date, YYYY-MM-DD. */
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected YYYY-MM-DD' })
    .optional(),
  militaryStatus: z.string().optional(),
})

export const ContactSchema = z.object({
  email: z.string().email(),
  phone: PhoneString,
  /** Omit or leave undefined when not yet available. */
  linkedin: z.string().url().optional(),
  website: z.string().url().optional(),
})

export const SummarySchema = z.object({
  bio: z.string().min(1),
  yearsOfExperience: z.number().int().min(0),
  highlights: z.array(z.string().min(1)),
})

export const SkillSchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(0).max(100),
})

export const SkillsSchema = z.object({
  // The handful of technologies worth leading with. The PDF prints this as a
  // "Core Stack" line and keeps the full categorised lists compact underneath,
  // so a reader gets the headline without wading through every tag. Optional so
  // older data still validates.
  core: z.array(z.string().min(1)).optional(),
  languages: z.array(SkillSchema),
  frameworks: z.array(SkillSchema),
  databases: z.array(SkillSchema),
  devops: z.array(SkillSchema),
  tools: z.array(SkillSchema),
  softSkills: z.array(z.string().min(1)),
})

export const ExperienceRoleSchema = z.object({
  title: z.string().min(1),
  startDate: MonthYearOrPresent,
  endDate: MonthYearOrPresent,
})

export const ExperienceAchievementSchema = z.object({
  metric: z.string(),
  value: z.string(),
  context: z.string(),
})

export const ExperienceSchema = z.object({
  company: z.string().min(1),
  companyUrl: z.string().url().optional(),
  location: z.string().optional(),
  workModel: z.enum(['onsite', 'remote', 'hybrid']),
  startDate: MonthYearOrPresent,
  endDate: MonthYearOrPresent,
  roles: z.array(ExperienceRoleSchema),
  teamSize: z.number().int().min(1).optional(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  achievements: z.array(ExperienceAchievementSchema),
  clients: z.array(z.string()),
  techStack: z.array(z.string()),
})

export const ProjectSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  role: z.string().min(1),
  techStack: z.array(z.string()),
  repoUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  image: z.string().optional(),
  highlights: z.array(z.string()),
})

export const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startYear: z.number().int().min(1900).max(2100),
  endYear: z.number().int().min(1900).max(2100),
  gpa: z.number().min(0).max(4),
})

export const HobbySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  frequency: z.number().int().min(1).max(5), // ดาว 1-5 แทนความสม่ำเสมอ
})

export const CtaSchema = z.object({
  message: z.string(),
  availableMonthsFromNow: z.number().int().min(0).max(12),
  resumePdfUrl: z.string(),
  /** English CV PDF URL. Optional — omit or leave undefined until the English resume is available. */
  resumePdfUrlEn: z.string().optional(),
  qrCodeImage: z.string(),
  availableForHire: z.boolean(),
  preferredContact: z.string(),
})

export const CourseSchema = z.object({
  name: z.string().min(1),
  // Optional: the provider is no longer shown anywhere (site, PDF, or RAG
  // chunk), so entries omit it. Kept on the schema for older/imported data.
  provider: z.string().min(1).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
})

export const DesignConceptSchema = z.object({
  name: z.string().min(1),
  philosophy: z.string().min(1),
  moodKeywords: z.array(z.string().min(1)),
  inspiration: z.string().min(1),
})

export const SettingsSchema = z.object({
  language: z.enum(['th', 'en']),
  designConcept: DesignConceptSchema,
})

export const MeDataSchema = z.object({
  profile: ProfileSchema,
  contact: ContactSchema,
  summary: SummarySchema,
  skills: SkillsSchema,
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  education: z.array(EducationSchema),
  courses: z.array(CourseSchema),
  learningNow: z.array(z.string().min(1)),
  hobbies: z.array(HobbySchema),
  cta: CtaSchema,
  settings: SettingsSchema,
})

// ──────────────────────────────────────────
//  Inferred TypeScript types
// ──────────────────────────────────────────

export type Profile = z.infer<typeof ProfileSchema>
export type Contact = z.infer<typeof ContactSchema>
export type Summary = z.infer<typeof SummarySchema>
export type Skill = z.infer<typeof SkillSchema>
export type Skills = z.infer<typeof SkillsSchema>
export type ExperienceRole = z.infer<typeof ExperienceRoleSchema>
export type ExperienceAchievement = z.infer<typeof ExperienceAchievementSchema>
export type Experience = z.infer<typeof ExperienceSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Education = z.infer<typeof EducationSchema>
export type Hobby = z.infer<typeof HobbySchema>
export type Course = z.infer<typeof CourseSchema>
export type Cta = z.infer<typeof CtaSchema>
export type DesignConcept = z.infer<typeof DesignConceptSchema>
export type Settings = z.infer<typeof SettingsSchema>
export type MeData = z.infer<typeof MeDataSchema>
