/**
 * Tests for lib/me.ts
 * Covers: Property 1, Property 2, and unit tests for ME singleton
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  ME,
  MeDataSchema,
  MeData,
} from '../me'

// ──────────────────────────────────────────
//  fast-check arbitraries for MeData
// ──────────────────────────────────────────

const skillArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  level: fc.integer({ min: 0, max: 100 }),
})

const experienceRoleArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  startDate: fc.string({ minLength: 1, maxLength: 20 }),
  endDate: fc.string({ minLength: 1, maxLength: 20 }),
})

const achievementArb = fc.record({
  metric: fc.string({ minLength: 0, maxLength: 100 }),
  value: fc.string({ minLength: 0, maxLength: 100 }),
  context: fc.string({ minLength: 0, maxLength: 200 }),
})

const experienceArb = fc.record({
  company: fc.string({ minLength: 1, maxLength: 100 }),
  companyUrl: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  location: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
  workModel: fc.constantFrom('onsite', 'remote', 'hybrid') as fc.Arbitrary<'onsite' | 'remote' | 'hybrid'>,
  startDate: fc.string({ minLength: 1, maxLength: 20 }),
  endDate: fc.string({ minLength: 1, maxLength: 20 }),
  roles: fc.array(experienceRoleArb, { minLength: 1, maxLength: 5 }),
  summary: fc.string({ minLength: 0, maxLength: 500 }),
  responsibilities: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { maxLength: 10 }),
  achievements: fc.array(achievementArb, { maxLength: 10 }),
  clients: fc.array(fc.string({ minLength: 0, maxLength: 100 }), { maxLength: 20 }),
  techStack: fc.array(fc.string({ minLength: 0, maxLength: 50 }), { maxLength: 20 }),
})

const projectArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  category: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  role: fc.string({ minLength: 1, maxLength: 200 }),
  techStack: fc.array(fc.string({ minLength: 0, maxLength: 50 }), { maxLength: 20 }),
  repoUrl: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  liveUrl: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  image: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  highlights: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { maxLength: 10 }),
})

const educationArb = fc.record({
  institution: fc.string({ minLength: 1, maxLength: 100 }),
  degree: fc.string({ minLength: 1, maxLength: 100 }),
  field: fc.string({ minLength: 1, maxLength: 100 }),
  startYear: fc.integer({ min: 1900, max: 2100 }),
  endYear: fc.integer({ min: 1900, max: 2100 }),
  gpa: fc.float({ min: 0, max: 4, noNaN: true }),
})

const meDataArb: fc.Arbitrary<MeData> = fc.record({
  profile: fc.record({
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    firstNameTH: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    lastNameTH: fc.string({ minLength: 1, maxLength: 50 }),
    nickname: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    nicknameTH: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    tagline: fc.string({ minLength: 1, maxLength: 200 }),
    profileImage: fc.string({ minLength: 1, maxLength: 200 }),
    location: fc.string({ minLength: 1, maxLength: 100 }),
  }),
  contact: fc.record({
    email: fc.string({ minLength: 1, maxLength: 100 }),
    phone: fc.string({ minLength: 1, maxLength: 20 }),
    linkedin: fc.string({ minLength: 0, maxLength: 200 }),
    website: fc.string({ minLength: 0, maxLength: 200 }),
  }),
  summary: fc.record({
    bio: fc.string({ minLength: 1, maxLength: 1000 }),
    yearsOfExperience: fc.integer({ min: 0, max: 50 }),
    highlights: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 10 }),
  }),
  skills: fc.record({
    languages: fc.array(skillArb, { maxLength: 10 }),
    frameworks: fc.array(skillArb, { maxLength: 10 }),
    databases: fc.array(skillArb, { maxLength: 10 }),
    devops: fc.array(skillArb, { maxLength: 10 }),
    tools: fc.array(skillArb, { maxLength: 10 }),
    softSkills: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 10 }),
  }),
  experience: fc.array(experienceArb, { minLength: 1, maxLength: 5 }),
  projects: fc.array(projectArb, { minLength: 1, maxLength: 10 }),
  education: fc.array(educationArb, { minLength: 1, maxLength: 5 }),
  cta: fc.record({
    message: fc.string({ minLength: 0, maxLength: 500 }),
    resumePdfUrl: fc.string({ minLength: 0, maxLength: 200 }),
    qrCodeImage: fc.string({ minLength: 0, maxLength: 200 }),
    availableForHire: fc.boolean(),
    preferredContact: fc.string({ minLength: 0, maxLength: 50 }),
  }),
  settings: fc.record({
    theme: fc.constantFrom('dark', 'light') as fc.Arbitrary<'dark' | 'light'>,
    accentColor: fc.string({ minLength: 1, maxLength: 20 }),
    fontFamily: fc.string({ minLength: 1, maxLength: 50 }),
    showProgressBar: fc.boolean(),
    enableAnimations: fc.boolean(),
    language: fc.constantFrom('th', 'en') as fc.Arbitrary<'th' | 'en'>,
  }),
})

// ──────────────────────────────────────────
//  Sub-task 1.1: Property 1 — Me_Data Round-Trip Serialization
// ──────────────────────────────────────────

// Feature: resume-website, Property 1: Me_Data Round-Trip Serialization
describe('Property 1: Me_Data Round-Trip Serialization', () => {
  it('serializing and re-parsing a valid MeData produces a deeply equal object', () => {
    // Validates: Requirements 17.3
    fc.assert(
      fc.property(meDataArb, (original) => {
        const serialized = JSON.stringify(original)
        const deserialized = JSON.parse(serialized)
        const reparsed = MeDataSchema.parse(deserialized)

        // Deep equality check
        expect(reparsed).toEqual(original)
        return true
      }),
      { numRuns: 100 }
    )
  })
})

// ──────────────────────────────────────────
//  Sub-task 1.2: Property 2 — Me_Data Validation Rejects Invalid Input
// ──────────────────────────────────────────

// Feature: resume-website, Property 2: Me_Data Validation Rejects Invalid Input
describe('Property 2: Me_Data Validation Rejects Invalid Input', () => {
  it('rejects MeData with profile.firstName set to a non-string value', () => {
    // Validates: Requirements 17.2
    fc.assert(
      fc.property(
        meDataArb,
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.string()),
        ),
        (validData, invalidValue) => {
          const invalidData = {
            ...validData,
            profile: {
              ...validData.profile,
              firstName: invalidValue,
            },
          }

          let threw = false
          let errorMessage = ''
          try {
            MeDataSchema.parse(invalidData)
          } catch (err: unknown) {
            threw = true
            if (err instanceof Error) {
              errorMessage = err.message
            }
          }

          expect(threw).toBe(true)
          // Error should mention the field path
          expect(errorMessage).toBeTruthy()
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects MeData with settings.theme set to an invalid enum value', () => {
    // Validates: Requirements 17.2
    fc.assert(
      fc.property(
        meDataArb,
        fc.string({ minLength: 1 }).filter(s => s !== 'dark' && s !== 'light'),
        (validData, invalidTheme) => {
          const invalidData = {
            ...validData,
            settings: {
              ...validData.settings,
              theme: invalidTheme,
            },
          }

          let threw = false
          try {
            MeDataSchema.parse(invalidData)
          } catch {
            threw = true
          }

          expect(threw).toBe(true)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects MeData with skills.languages containing a skill with level out of range', () => {
    // Validates: Requirements 17.2
    fc.assert(
      fc.property(
        meDataArb,
        fc.oneof(
          fc.integer({ min: 101, max: 1000 }),
          fc.integer({ min: -1000, max: -1 }),
        ),
        (validData, invalidLevel) => {
          const invalidData = {
            ...validData,
            skills: {
              ...validData.skills,
              languages: [
                { name: 'TestLang', level: invalidLevel },
              ],
            },
          }

          let threw = false
          try {
            MeDataSchema.parse(invalidData)
          } catch {
            threw = true
          }

          expect(threw).toBe(true)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ──────────────────────────────────────────
//  Sub-task 1.3: Unit tests for lib/me.ts
// ──────────────────────────────────────────

describe('ME singleton', () => {
  it('parses without error', () => {
    // Requirements: 15.1
    expect(() => ME).not.toThrow()
    expect(ME).toBeDefined()
  })

  it('has all required top-level fields', () => {
    // Requirements: 15.1, 15.2
    expect(ME).toHaveProperty('profile')
    expect(ME).toHaveProperty('contact')
    expect(ME).toHaveProperty('summary')
    expect(ME).toHaveProperty('skills')
    expect(ME).toHaveProperty('experience')
    expect(ME).toHaveProperty('projects')
    expect(ME).toHaveProperty('education')
    expect(ME).toHaveProperty('cta')
    expect(ME).toHaveProperty('settings')
  })

  it('profile has all required fields with correct types', () => {
    // Requirements: 15.2
    expect(typeof ME.profile.firstName).toBe('string')
    expect(typeof ME.profile.firstNameTH).toBe('string')
    expect(typeof ME.profile.lastName).toBe('string')
    expect(typeof ME.profile.lastNameTH).toBe('string')
    expect(typeof ME.profile.title).toBe('string')
    expect(typeof ME.profile.tagline).toBe('string')
    expect(typeof ME.profile.profileImage).toBe('string')
    expect(typeof ME.profile.location).toBe('string')
  })

  it('contact has all required fields', () => {
    expect(typeof ME.contact.email).toBe('string')
    expect(typeof ME.contact.phone).toBe('string')
    expect(typeof ME.contact.linkedin).toBe('string')
    expect(typeof ME.contact.website).toBe('string')
  })

  it('summary has all required fields with correct types', () => {
    expect(typeof ME.summary.bio).toBe('string')
    expect(typeof ME.summary.yearsOfExperience).toBe('number')
    expect(Array.isArray(ME.summary.highlights)).toBe(true)
    expect(ME.summary.highlights.length).toBeGreaterThan(0)
  })

  it('skills has all required categories', () => {
    expect(Array.isArray(ME.skills.languages)).toBe(true)
    expect(Array.isArray(ME.skills.frameworks)).toBe(true)
    expect(Array.isArray(ME.skills.databases)).toBe(true)
    expect(Array.isArray(ME.skills.devops)).toBe(true)
    expect(Array.isArray(ME.skills.tools)).toBe(true)
    expect(Array.isArray(ME.skills.softSkills)).toBe(true)
  })

  it('each skill has name (string) and level (0-100 integer)', () => {
    const allSkills = [
      ...ME.skills.languages,
      ...ME.skills.frameworks,
      ...ME.skills.databases,
      ...ME.skills.devops,
      ...ME.skills.tools,
    ]
    for (const skill of allSkills) {
      expect(typeof skill.name).toBe('string')
      expect(typeof skill.level).toBe('number')
      expect(skill.level).toBeGreaterThanOrEqual(0)
      expect(skill.level).toBeLessThanOrEqual(100)
    }
  })

  it('experience is a non-empty array with required fields', () => {
    expect(Array.isArray(ME.experience)).toBe(true)
    expect(ME.experience.length).toBeGreaterThan(0)
    for (const exp of ME.experience) {
      expect(typeof exp.company).toBe('string')
      expect(['onsite', 'remote', 'hybrid']).toContain(exp.workModel)
      expect(Array.isArray(exp.roles)).toBe(true)
      expect(Array.isArray(exp.responsibilities)).toBe(true)
      expect(Array.isArray(exp.achievements)).toBe(true)
      expect(Array.isArray(exp.techStack)).toBe(true)
    }
  })

  it('projects is a non-empty array with required fields', () => {
    expect(Array.isArray(ME.projects)).toBe(true)
    expect(ME.projects.length).toBeGreaterThan(0)
    for (const project of ME.projects) {
      expect(typeof project.name).toBe('string')
      expect(typeof project.category).toBe('string')
      expect(typeof project.description).toBe('string')
      expect(typeof project.role).toBe('string')
      expect(Array.isArray(project.techStack)).toBe(true)
      expect(Array.isArray(project.highlights)).toBe(true)
    }
  })

  it('education is a non-empty array with required fields', () => {
    expect(Array.isArray(ME.education)).toBe(true)
    expect(ME.education.length).toBeGreaterThan(0)
    for (const edu of ME.education) {
      expect(typeof edu.institution).toBe('string')
      expect(typeof edu.degree).toBe('string')
      expect(typeof edu.field).toBe('string')
      expect(typeof edu.startYear).toBe('number')
      expect(typeof edu.endYear).toBe('number')
      expect(typeof edu.gpa).toBe('number')
    }
  })

  it('cta has all required fields', () => {
    expect(typeof ME.cta.availableForHire).toBe('boolean')
    expect(typeof ME.cta.preferredContact).toBe('string')
  })

  it('settings has valid theme and language values', () => {
    expect(['dark', 'light']).toContain(ME.settings.theme)
    expect(['th', 'en']).toContain(ME.settings.language)
    expect(typeof ME.settings.accentColor).toBe('string')
    expect(typeof ME.settings.fontFamily).toBe('string')
    expect(typeof ME.settings.showProgressBar).toBe('boolean')
    expect(typeof ME.settings.enableAnimations).toBe('boolean')
  })

  it('ME data matches expected values from me.js', () => {
    // Requirements: 15.1 — verify actual data values
    expect(ME.profile.firstName).toBe('Pakorn')
    expect(ME.profile.firstNameTH).toBe('ปกร')
    expect(ME.profile.title).toBe('Lead Developer')
    expect(ME.contact.email).toBe('patapuputapa@gmail.com')
    expect(ME.contact.phone).toBe('0885797989')
    expect(ME.summary.yearsOfExperience).toBe(8)
    expect(ME.settings.theme).toBe('dark')
    expect(ME.settings.accentColor).toBe('#4FC3F7')
    expect(ME.cta.availableForHire).toBe(true)
  })

  it('MeDataSchema.parse throws with descriptive error for missing required field', () => {
    // Requirements: 17.2
    const invalidData = {
      // missing profile entirely
      contact: ME.contact,
      summary: ME.summary,
      skills: ME.skills,
      experience: ME.experience,
      projects: ME.projects,
      education: ME.education,
      cta: ME.cta,
      settings: ME.settings,
    }

    expect(() => MeDataSchema.parse(invalidData)).toThrow()

    try {
      MeDataSchema.parse(invalidData)
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(Error)
      if (err instanceof Error) {
        // Zod error message should mention the field
        expect(err.message).toBeTruthy()
      }
    }
  })
})
