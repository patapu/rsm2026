/**
 * scripts/generate-pdf.tsx
 * Generate resume PDF from me.ts data → public/resume-pakorn.pdf
 * Run: npx tsx scripts/generate-pdf.tsx
 */

import React from 'react'
import { renderToFile, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'
import { ME } from '../lib/me'

// ──────────────────────────────────────────
//  Register Thai Font
// ──────────────────────────────────────────

Font.register({
  family: 'NotoSansThai',
  fonts: [
    {
      src: path.resolve(__dirname, 'fonts/NotoSansThai-Regular.ttf'),
      fontWeight: 'normal',
    },
    {
      src: path.resolve(__dirname, 'fonts/NotoSansThai-Bold.ttf'),
      fontWeight: 'bold',
    },
  ],
})

// ──────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────

const colors = {
  accent: '#4FC3F7',
  text: '#1a1a1a',
  muted: '#555555',
  border: '#e0e0e0',
  bg: '#ffffff',
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'NotoSansThai',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 12,
  },
  name: {
    fontSize: 22,
    fontFamily: 'NotoSansThai',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    color: colors.accent,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    fontSize: 9,
    color: colors.muted,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'NotoSansThai',
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
  },
  bulletItem: {
    fontSize: 9,
    marginBottom: 2,
    paddingLeft: 8,
  },
  expCompany: {
    fontSize: 11,
    fontFamily: 'NotoSansThai',
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
    fontFamily: 'NotoSansThai',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  skillTag: {
    fontSize: 8,
    backgroundColor: '#f0f0f0',
    padding: '2 6',
    borderRadius: 3,
  },
  projectItem: {
    marginBottom: 8,
  },
  projectName: {
    fontSize: 10,
    fontFamily: 'NotoSansThai',
    fontWeight: 'bold',
    marginBottom: 1,
  },
  projectDesc: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 2,
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
//  PDF Document Component
// ──────────────────────────────────────────

function ResumePDF() {
  const { profile, contact, summary, skills, experience, projects, education, courses, learningNow } = ME

  return (
    <Document title={`Resume - ${profile.firstName} ${profile.lastName}`} author={profile.firstName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {profile.firstName} {profile.lastName} ({profile.nicknameTH})
          </Text>
          <Text style={styles.title}>{profile.title}</Text>
          <View style={styles.contactRow}>
            <Text>{contact.email}</Text>
            <Text>{contact.phone}</Text>
            <Text>{profile.location}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.bio}>{summary.bio}</Text>
          {summary.highlights.map((h, i) => (
            <Text key={i} style={styles.bulletItem}>• {h}</Text>
          ))}
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          {Object.entries(skills).map(([category, items]) => {
            if (category === 'softSkills') {
              return (
                <View key={category} style={{ marginBottom: 4 }}>
                  <Text style={styles.skillCategory}>Soft Skills</Text>
                  <View style={styles.skillRow}>
                    {(items as string[]).map((s, i) => (
                      <Text key={i} style={styles.skillTag}>{s}</Text>
                    ))}
                  </View>
                </View>
              )
            }
            const skillItems = items as { name: string; level: number }[]
            return (
              <View key={category} style={{ marginBottom: 4 }}>
                <Text style={styles.skillCategory}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                <View style={styles.skillRow}>
                  {skillItems.map((s, i) => (
                    <Text key={i} style={styles.skillTag}>{s.name}</Text>
                  ))}
                </View>
              </View>
            )
          })}
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
                <Text key={j} style={styles.bulletItem}>• {r}</Text>
              ))}
              {exp.techStack.length > 0 && (
                <Text style={{ ...styles.bulletItem, color: colors.muted, marginTop: 2 }}>
                  Tech: {exp.techStack.join(', ')}
                </Text>
              )}
            </View>
          ))}
        </View>
      </Page>

      {/* Page 3: Projects + Education */}
      <Page size="A4" style={styles.page}>
        {/* Projects */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {projects.map((proj, i) => (
            <View key={i} style={styles.projectItem}>
              <Text style={styles.projectName}>{proj.name} — {proj.category}</Text>
              <Text style={styles.projectDesc}>{proj.description}</Text>
              <Text style={{ ...styles.bulletItem, color: colors.muted }}>
                Tech: {proj.techStack.join(', ')}
              </Text>
            </View>
          ))}
        </View>

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {education.map((edu, i) => (
            <View key={i} style={styles.eduItem}>
              <Text style={{ fontFamily: 'NotoSansThai', fontWeight: 'bold', fontSize: 10 }}>
                {edu.institution}
              </Text>
              <Text style={{ fontSize: 9, color: colors.muted }}>
                {edu.degree} — {edu.field} ({edu.startYear}-{edu.endYear}) GPA: {edu.gpa}
              </Text>
            </View>
          ))}
        </View>

        {/* Courses & Training */}
        {courses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Courses & Training</Text>
            {courses.map((course, i) => (
              <Text key={i} style={styles.bulletItem}>
                • {course.name} — {course.provider}
              </Text>
            ))}
          </View>
        )}

        {/* Learning Now */}
        {learningNow.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currently Learning</Text>
            <View style={styles.skillRow}>
              {learningNow.map((item, i) => (
                <Text key={i} style={styles.skillTag}>{item}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated from pakorn.dev • {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}
        </Text>
      </Page>
    </Document>
  )
}

// ──────────────────────────────────────────
//  Generate & Save
// ──────────────────────────────────────────

async function main() {
  const outputPath = path.resolve(__dirname, '../public/resume-pakorn.pdf')
  console.log('📄 Generating resume PDF...')
  await renderToFile(<ResumePDF />, outputPath)
  console.log(`✅ PDF saved to: ${outputPath}`)
}

main().catch((err) => {
  console.error('❌ PDF generation failed:', err)
  process.exit(1)
})
