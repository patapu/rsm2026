/**
 * Tests for lib/me
 * Covers: property-based validation + unit tests for ME singleton
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  ME,
  MeDataSchema,
  type MeData,
  getAvailableMessage,
} from '../me'

// ──────────────────────────────────────────
//  fast-check arbitraries for MeData
// ──────────────────────────────────────────

const monthYearArb = fc
  .tuple(
    fc.integer({ min: 1900, max: 2100 }),
    fc.integer({ min: 1, max: 12 }),
  )
  .map(([y, m]) => `${y}-${String(m).padStart(2, '0')}`)

const monthYearOrPresentArb = fc.oneof(monthYearArb, fc.constant('present'))

const skillArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  level: fc.integer({ min: 0, max: 100 }),
})

const experienceRoleArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  startDate: monthYearOrPresentArb,
  endDate: monthYearOrPresentArb,
})

const achievementArb = fc.record({
  metric: fc.string({ minLength: 0, maxLength: 100 }),
  value: fc.string({ minLength: 0, maxLength: 100 }),
  context: fc.string({ minLength: 0, maxLength: 200 }),
})

const experienceArb = fc.record({
  company: fc.string({ minLength: 1, maxLength: 100 }),
  workModel: fc.constantFrom('onsite', 'remote', 'hybrid') as fc.Arbitrary<'onsite' | 'remote' | 'hybrid'>,
  startDate: monthYearOrPresentArb,
  endDate: monthYearOrPresentArb,
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

const hobbyArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.string({ minLength: 1, maxLength: 10 }),
  frequency: fc.integer({ min: 1, max: 5 }),
})

const courseArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  provider: fc.string({ minLength: 1, maxLength: 100 }),
})

const meDataArb: fc.Arbitrary<MeData> = fc.record({
  profile: fc.record({
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    firstNameTH: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    lastNameTH: fc.string({ minLength: 1, maxLength: 50 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    tagline: fc.string({ minLength: 1, maxLength: 200 }),
    location: fc.string({ minLength: 1, maxLength: 100 }),
  }),
  contact: fc.record({
    email: fc.constantFrom('a@b.com', 'foo.bar@example.co.th', 'x@y.io'),
    phone: fc.constantFrom('0885797989', '+66-88-579-7989', '(02) 123-4567'),
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
  courses: fc.array(courseArb, { maxLength: 5 }),
  learningNow: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
  hobbies: fc.array(hobbyArb, { maxLength: 10 }),
  cta: fc.record({
    message: fc.string({ minLength: 0, maxLength: 500 }),
    availableMonthsFromNow: fc.integer({ min: 0, max: 12 }),
    resumePdfUrl: fc.string({ minLength: 0, maxLength: 200 }),
    qrCodeImage: fc.string({ minLength: 0, maxLength: 200 }),
    availableForHire: fc.boolean(),
    preferredContact: fc.string({ minLength: 0, maxLength: 50 }),
  }),
  settings: fc.record({
    language: fc.constantFrom('th', 'en') as fc.Arbitrary<'th' | 'en'>,
    designConcept: fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      philosophy: fc.string({ minLength: 1, maxLength: 500 }),
      moodKeywords: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
      inspiration: fc.string({ minLength: 1, maxLength: 500 }),
    }),
  }),
})

// ──────────────────────────────────────────
//  Property 1: Round-Trip Serialization
// ──────────────────────────────────────────

describe('Property 1: Me_Data Round-Trip Serialization', () => {
  it('serializing and re-parsing a valid MeData produces a deeply equal object', () => {
    fc.assert(
      fc.property(meDataArb, (original) => {
        const serialized = JSON.stringify(original)
        const deserialized = JSON.parse(serialized)
        const reparsed = MeDataSchema.parse(deserialized)
        expect(reparsed).toEqual(original)
        return true
      }),
      { numRuns: 50 }
    )
  })
})

// ──────────────────────────────────────────
//  Property 2: Validation Rejects Invalid Input
// ──────────────────────────────────────────

describe('Property 2: Me_Data Validation Rejects Invalid Input', () => {
  it('rejects MeData with profile.firstName set to a non-string value', () => {
    fc.assert(
      fc.property(
        meDataArb,
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.array(fc.string()),
        ),
        (validData, invalidValue) => {
          const invalidData = {
            ...validData,
            profile: { ...validData.profile, firstName: invalidValue },
          }
          expect(() => MeDataSchema.parse(invalidData)).toThrow()
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('rejects MeData with settings.language set to an invalid enum value', () => {
    fc.assert(
      fc.property(
        meDataArb,
        fc.string({ minLength: 1 }).filter((s) => s !== 'th' && s !== 'en'),
        (validData, invalidLanguage) => {
          const invalidData = {
            ...validData,
            settings: { ...validData.settings, language: invalidLanguage },
          }
          expect(() => MeDataSchema.parse(invalidData)).toThrow()
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('rejects MeData with a skill level out of range', () => {
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
              languages: [{ name: 'TestLang', level: invalidLevel }],
            },
          }
          expect(() => MeDataSchema.parse(invalidData)).toThrow()
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('rejects experience startDate that is not YYYY-MM or "present"', () => {
    fc.assert(
      fc.property(
        meDataArb,
        fc.constantFrom('2020', 'yesterday', '2020/01', '01-2020', ''),
        (validData, invalidDate) => {
          const firstExp = validData.experience[0]
          const invalidData = {
            ...validData,
            experience: [
              { ...firstExp, startDate: invalidDate },
              ...validData.experience.slice(1),
            ],
          }
          expect(() => MeDataSchema.parse(invalidData)).toThrow()
          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  it('rejects contact email that is not a valid email address', () => {
    fc.assert(
      fc.property(
        meDataArb,
        fc.constantFrom('not-an-email', 'foo@', '@bar.com', ''),
        (validData, invalidEmail) => {
          const invalidData = {
            ...validData,
            contact: { ...validData.contact, email: invalidEmail },
          }
          expect(() => MeDataSchema.parse(invalidData)).toThrow()
          return true
        }
      ),
      { numRuns: 30 }
    )
  })
})

// ──────────────────────────────────────────
//  Unit tests for the ME singleton
// ──────────────────────────────────────────

describe('ME singleton', () => {
  it('parses without error', () => {
    expect(() => ME).not.toThrow()
    expect(ME).toBeDefined()
  })

  it('has all required top-level fields', () => {
    expect(ME).toHaveProperty('profile')
    expect(ME).toHaveProperty('contact')
    expect(ME).toHaveProperty('summary')
    expect(ME).toHaveProperty('skills')
    expect(ME).toHaveProperty('experience')
    expect(ME).toHaveProperty('projects')
    expect(ME).toHaveProperty('education')
    expect(ME).toHaveProperty('courses')
    expect(ME).toHaveProperty('learningNow')
    expect(ME).toHaveProperty('hobbies')
    expect(ME).toHaveProperty('cta')
    expect(ME).toHaveProperty('settings')
  })

  it('profile has all required fields with correct types', () => {
    expect(typeof ME.profile.firstName).toBe('string')
    expect(typeof ME.profile.firstNameTH).toBe('string')
    expect(typeof ME.profile.lastName).toBe('string')
    expect(typeof ME.profile.lastNameTH).toBe('string')
    expect(typeof ME.profile.title).toBe('string')
    expect(typeof ME.profile.tagline).toBe('string')
    expect(typeof ME.profile.location).toBe('string')
  })

  it('contact email is a valid email string', () => {
    expect(typeof ME.contact.email).toBe('string')
    expect(ME.contact.email).toMatch(/@/)
    expect(typeof ME.contact.phone).toBe('string')
  })

  it('linkedin and website are either a URL string or undefined', () => {
    for (const field of [ME.contact.linkedin, ME.contact.website]) {
      expect(field === undefined || typeof field === 'string').toBe(true)
    }
  })

  it('summary has required fields with correct types', () => {
    expect(typeof ME.summary.bio).toBe('string')
    expect(typeof ME.summary.yearsOfExperience).toBe('number')
    expect(Array.isArray(ME.summary.highlights)).toBe(true)
    expect(ME.summary.highlights.length).toBeGreaterThan(0)
  })

  it('every skill has name (string) and level (0-100 integer)', () => {
    const allSkills = [
      ...ME.skills.languages,
      ...ME.skills.frameworks,
      ...ME.skills.databases,
      ...ME.skills.devops,
      ...ME.skills.tools,
    ]
    for (const skill of allSkills) {
      expect(typeof skill.name).toBe('string')
      expect(skill.level).toBeGreaterThanOrEqual(0)
      expect(skill.level).toBeLessThanOrEqual(100)
    }
  })

  it('experience entries use valid workModel and YYYY-MM / present dates', () => {
    expect(ME.experience.length).toBeGreaterThan(0)
    for (const exp of ME.experience) {
      expect(['onsite', 'remote', 'hybrid']).toContain(exp.workModel)
      expect(exp.startDate).toMatch(/^(\d{4}-\d{2}|present)$/)
      expect(exp.endDate).toMatch(/^(\d{4}-\d{2}|present)$/)
    }
  })

  it('ME data matches expected values', () => {
    expect(ME.profile.firstName).toBe('Pakorn')
    expect(ME.profile.firstNameTH).toBe('ปกร')
    expect(ME.profile.title).toBe('Lead Developer')
    expect(ME.contact.email).toBe('patapuputapa@gmail.com')
    expect(ME.contact.phone).toBe('0885797989')
    expect(ME.summary.yearsOfExperience).toBe(8)
    expect(ME.settings.language).toBe('th')
    expect(ME.cta.availableForHire).toBe(true)
  })

  it('MeDataSchema.parse throws for missing required field', () => {
    const partial = { ...ME } as unknown as Record<string, unknown>
    delete partial.profile
    expect(() => MeDataSchema.parse(partial)).toThrow()
  })
})

// ──────────────────────────────────────────
//  getAvailableMessage
// ──────────────────────────────────────────

describe('getAvailableMessage', () => {
  it('is deterministic for a given `now` date', () => {
    const now = new Date(2026, 0, 15) // Jan 15, 2026
    const first = getAvailableMessage(now)
    const second = getAvailableMessage(now)
    expect(first).toBe(second)
  })

  it('shifts the target month by availableMonthsFromNow', () => {
    // ME.cta.availableMonthsFromNow is 2 in the current data
    const now = new Date(2026, 0, 1) // Jan 2026
    const msg = getAvailableMessage(now)
    // Jan + 2 = March -> มีนาคม
    expect(msg).toContain('มีนาคม')
    expect(msg).toContain('2026')
  })

  it('handles month overflow into the next year', () => {
    // Dec + 2 = next-year Feb
    const now = new Date(2026, 11, 1) // Dec 2026
    const msg = getAvailableMessage(now)
    expect(msg).toContain('กุมภาพันธ์')
    expect(msg).toContain('2027')
  })
})
