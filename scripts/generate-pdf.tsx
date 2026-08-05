/**
 * scripts/generate-pdf.tsx
 * Generate resume PDFs from me.ts data -> public/resume-pakorn.pdf (TH) and
 * public/resume-pakorn-en.pdf (EN)
 * Run: npx tsx scripts/generate-pdf.tsx
 */

import React from 'react'
import { renderToFile, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import path from 'path'
import fs from 'fs'
import { ME, ME_EN, type MeData } from '../lib/me'

// ──────────────────────────────────────────
//  Register Thai Font
// ──────────────────────────────────────────

Font.register({
  family: 'Sarabun',
  fonts: [
    {
      src: path.resolve(__dirname, 'fonts/Sarabun-Regular.ttf'),
      fontWeight: 'normal',
    },
    {
      src: path.resolve(__dirname, 'fonts/Sarabun-Bold.ttf'),
      fontWeight: 'bold',
    },
  ],
})

// ──────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────

const colors = {
  accent: '#7EC8E3',
  text: '#1a1a1a',
  muted: '#555555',
  border: '#e0e0e0',
  bg: '#ffffff',
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Sarabun',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 12,
    gap: 14,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Sarabun',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    color: colors.accent,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    fontSize: 9,
    color: colors.muted,
    alignItems: 'baseline',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Sarabun',
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 3,
  },
  bio: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
    textIndent: 24,
  },
  bulletItem: {
    fontSize: 9,
    marginBottom: 2,
    paddingLeft: 16,
  },
  expCompany: {
    fontSize: 11,
    fontFamily: 'Sarabun',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  expRole: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  expPeriod: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 4,
  },
  expItem: {
    marginBottom: 10,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  skillCategory: {
    fontSize: 9,
    fontFamily: 'Sarabun',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  skillTag: {
    fontSize: 8,
    backgroundColor: '#f0f0f0',
    padding: '2 6',
    borderRadius: 3,
  },
  // Compact one-line form used for everything outside the Core Stack.
  skillLine: {
    fontSize: 8.5,
    lineHeight: 1.5,
    marginBottom: 1,
  },
  skillLineLabel: {
    fontFamily: 'Sarabun',
    fontWeight: 'bold',
  },
  projectItem: {
    marginBottom: 14,
  },
  projectName: {
    fontSize: 10,
    fontFamily: 'Sarabun',
    fontWeight: 'bold',
    marginBottom: 1,
  },
  projectDesc: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 2,
    textIndent: 24,
  },
  eduItem: {
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: colors.muted,
    textAlign: 'center',
  },
})

// ──────────────────────────────────────────
//  Profile Image (base64 data URI)
// ──────────────────────────────────────────

const profileImageBuffer = fs.readFileSync(path.resolve(__dirname, '../assets/profile.png'))
const profileImagePath = `data:image/png;base64,${profileImageBuffer.toString('base64')}`

// ──────────────────────────────────────────
//  PDF Document Component
// ──────────────────────────────────────────

/** Skill categories in print order, with the label the CV shows. `core` and
 *  `softSkills` are handled separately, so they are deliberately absent. */
const CATEGORY_LABELS: [keyof MeData['skills'] & ('languages' | 'frameworks' | 'databases' | 'devops' | 'tools'), string][] = [
  ['languages', 'Languages'],
  ['frameworks', 'Frameworks'],
  ['databases', 'Databases'],
  ['devops', 'DevOps'],
  ['tools', 'Tools'],
]

function ResumePDF({ data }: { data: MeData }) {
  const { profile, contact, summary, skills, experience, projects, education, courses, learningNow, settings } = data
  const locale = settings.language === 'en' ? 'en-US' : 'th-TH'
  const displayNickname = settings.language === 'en' ? profile.nickname : profile.nicknameTH

  return (
    <Document title={`Resume - ${profile.firstName} ${profile.lastName}`} author={profile.firstName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.profileImage} src={profileImagePath} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {profile.firstName} {profile.lastName} ({displayNickname})
            </Text>
            <Text style={styles.title}>{profile.title}</Text>
            <View style={styles.contactRow}>
              <Text>{contact.email}</Text>
              <Text>{contact.phone}</Text>
              <Text>{profile.location}</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.bio}>{summary.bio}</Text>
          {summary.highlights.map((h, i) => (
            <Text key={i} style={styles.bulletItem}>- {h}</Text>
          ))}
        </View>

        {/* Skills.
            The CV keeps the tag chips for the Core Stack only. Every other
            category collapses to one comma-separated line: same information,
            a fraction of the vertical space, and the reader's eye lands on the
            core stack instead of a wall of identical boxes. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>

          {skills.core && skills.core.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.skillCategory}>Core Stack</Text>
              <View style={styles.skillRow}>
                {skills.core.map((s, i) => (
                  <Text key={i} style={styles.skillTag}>{s}</Text>
                ))}
              </View>
            </View>
          )}

          {CATEGORY_LABELS.map(([key, label]) => {
            const items = skills[key] as { name: string; level: number }[]
            if (!items?.length) return null
            return (
              <Text key={key} style={styles.skillLine}>
                <Text style={styles.skillLineLabel}>{label}: </Text>
                {items.map((s) => s.name).join(', ')}
              </Text>
            )
          })}

          {skills.softSkills.length > 0 && (
            <Text style={styles.skillLine}>
              <Text style={styles.skillLineLabel}>Soft Skills: </Text>
              {skills.softSkills.join(', ')}
            </Text>
          )}
        </View>

      </Page>

      {/* Page 2: Experience */}
      <Page size="A4" style={styles.page}>
        {/* Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {experience.map((exp, i) => (
            <View key={i} style={styles.expItem}>
              <Text style={styles.expCompany}>
                {exp.company}{exp.teamSize ? ` (Team ${exp.teamSize})` : ''}
              </Text>
              {exp.roles.map((role, j) => (
                <Text key={j} style={styles.expRole}>
                  {role.title} ({role.startDate} - {role.endDate})
                </Text>
              ))}
              <Text style={styles.bio}>{exp.summary}</Text>
              {exp.responsibilities.slice(0, 4).map((r, j) => (
                <Text key={j} style={styles.bulletItem}>- {r}</Text>
              ))}
              {/* No tech block here: an employer's techStack is the union of
                  every project's, so on the CV it repeats the Skills page
                  almost verbatim. The per-project lines below carry the detail. */}
            </View>
          ))}
        </View>
      </Page>

      {/* Page 3: Projects */}
      <Page size="A4" style={styles.page}>
        {/* Projects */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {projects.map((proj, i) => (
            <View key={i} style={styles.projectItem} wrap={false}>
              <Text style={styles.projectName}>{proj.name} - {proj.category}</Text>
              <Text style={styles.projectDesc}>{proj.description}</Text>
              {/* One comma-separated line rather than up to 19 chips. Nothing
                  is dropped; it just stops eating half the page. */}
              {proj.techStack.length > 0 && (
                <Text style={styles.skillLine}>
                  <Text style={styles.skillLineLabel}>Tech: </Text>
                  {proj.techStack.join(', ')}
                </Text>
              )}
            </View>
          ))}
        </View>
      </Page>

      {/* Page 4: Education + Courses + Learning */}
      <Page size="A4" style={styles.page}>
        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {education.map((edu, i) => (
            <View key={i} style={styles.eduItem}>
              <Text style={{ fontFamily: 'Sarabun', fontWeight: 'bold', fontSize: 10 }}>
                {edu.institution}
              </Text>
              <Text style={{ fontSize: 9, color: colors.muted }}>
                {edu.degree} - {edu.field} ({edu.startYear}-{edu.endYear}) GPA: {edu.gpa}
              </Text>
            </View>
          ))}
        </View>

        {/* Courses & Training, with Currently Learning folded in under the
            same heading (matches components/sections/Education.tsx). */}
        {(courses.length > 0 || learningNow.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Courses & Training</Text>
            {courses.map((course, i) => (
              <Text key={i} style={styles.bulletItem}>
                - {course.name}
              </Text>
            ))}
            {learningNow.map((item, i) => (
              <Text key={`learning-${i}`} style={styles.bulletItem}>
                - {item}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated from pakorn.dev | {new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long' })}
        </Text>
      </Page>
    </Document>
  )
}

// ──────────────────────────────────────────
//  Generate & Save
// ──────────────────────────────────────────

async function main() {
  const thOutputPath = path.resolve(__dirname, '../public/resume-pakorn.pdf')
  console.log('Generating resume PDF (TH)...')
  await renderToFile(<ResumePDF data={ME} />, thOutputPath)
  console.log(`PDF saved to: ${thOutputPath}`)

  const enOutputPath = path.resolve(__dirname, '../public/resume-pakorn-en.pdf')
  console.log('Generating resume PDF (EN)...')
  await renderToFile(<ResumePDF data={ME_EN} />, enOutputPath)
  console.log(`PDF saved to: ${enOutputPath}`)
}

main().catch((err) => {
  console.error('PDF generation failed:', err)
  process.exit(1)
})
