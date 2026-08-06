/**
 * scripts/build-chunks.ts — Phase 1 of the resume-chatbot RAG upgrade.
 *
 * WHAT THIS DOES (and why it matters for RAG):
 * The chatbot today ships the ENTIRE `ME` object to the model on every request
 * (see app/api/chat/route.ts:275). RAG replaces that with "retrieve only the
 * relevant slice per question". Before you can retrieve, you must CHUNK: split
 * the resume into small, self-contained passages that can each be embedded and
 * searched independently.
 *
 * KEY IDEA: an embedding model turns TEXT into a vector. It works best on
 * coherent natural-language prose, NOT raw JSON. So each chunk below serializes
 * a piece of structured `ME` data into a readable Thai passage — that passage
 * is what we'll embed in Phase 2.
 *
 * This script has zero external dependencies and never touches the live route —
 * it just reads `ME` and writes lib/me/chunks.json. Run it with:
 *   npx tsx scripts/build-chunks.ts
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ME } from '../lib/me'

/**
 * One retrievable unit. `text` is the ONLY field that gets embedded/searched;
 * everything else is metadata we carry along so the app can cite the source,
 * filter by type, or render a rich block later.
 */
interface Chunk {
  id: string
  type: 'about' | 'skills' | 'experience' | 'project' | 'education' | 'courses'
  title: string
  text: string
}

const chunks: Chunk[] = []

// ── 1. About / summary ──────────────────────────────────────────
// The "who is this person" chunk — answers "แนะนำตัวหน่อย" / "ทำอะไร".
chunks.push({
  id: 'about',
  type: 'about',
  title: `${ME.profile.firstNameTH} ${ME.profile.lastNameTH} ตำแหน่ง ${ME.profile.title}`,
  text: [
    `${ME.profile.firstNameTH} ${ME.profile.lastNameTH} (${ME.profile.nickname}), ตำแหน่ง ${ME.profile.title}.`,
    ME.profile.tagline,
    `ประสบการณ์ ${ME.summary.yearsOfExperience}+ ปี. ${ME.summary.bio}`,
    `จุดเด่น: ${ME.summary.highlights.join(' / ')}`,
  ].join(' '),
})

// ── 2. Skills ───────────────────────────────────────────────────
// One chunk PER skill category. Why not one giant skills chunk? Granularity:
// a question about "databases" should retrieve the DB chunk, not dilute the
// match with devops/tools noise. This is a core chunking-size tradeoff —
// too coarse = irrelevant text rides along; too fine = context gets fragmented.
const skillGroups: Array<[string, { name: string; level: number }[]]> = [
  ['ภาษาโปรแกรม', ME.skills.languages],
  ['Frameworks & Libraries', ME.skills.frameworks],
  ['ฐานข้อมูล', ME.skills.databases],
  ['DevOps & Cloud', ME.skills.devops],
  // Latin, not 'เครื่องมือ & AI': the chat status line keeps a title for an
  // English reader whenever any Latin character survives, and "AI" alone was
  // enough to let the Thai through. Same reason the soft-skills title uses a
  // colon. The other Thai labels here carry no Latin at all, so they are
  // correctly dropped for English readers rather than leaking.
  ['Tools & AI', ME.skills.tools],
]
for (const [label, list] of skillGroups) {
  chunks.push({
    id: `skills-${label}`,
    type: 'skills',
    title: `ทักษะ: ${label}`,
    // Include the level so the model can answer "ถนัด X แค่ไหน" precisely.
    text: `ทักษะด้าน ${label} ของ ${ME.profile.nickname}: ${list
      .map((s) => `${s.name} (${s.level}/100)`)
      .join(', ')}.`,
  })
}
// Soft skills as their own chunk — different question space than hard skills.
chunks.push({
  id: 'skills-soft',
  type: 'skills',
  // Colon, not " / ": the chat status line strips the label before a colon
  // when the visitor is reading in English, so this renders as "Soft skills"
  // there and "ทักษะเชิงระบบ Soft skills" in Thai. With a slash it survived
  // whole and an English reader got mixed script.
  title: 'ทักษะเชิงระบบ: Soft skills',
  text: `ทักษะเชิงระบบและการทำงาน: ${ME.skills.softSkills.join(' / ')}.`,
})

// ── 3. Experience ───────────────────────────────────────────────
// One chunk per employer. Each is a self-contained career-history passage.
for (const exp of ME.experience) {
  const roles = exp.roles.map((r) => `${r.title} (${r.startDate}–${r.endDate})`).join(', ')
  const achievements = exp.achievements
    .map((a) => `${a.metric}: ${a.value}${a.context ? ` (${a.context})` : ''}`)
    .join('; ')
  chunks.push({
    id: `experience-${exp.company}`,
    type: 'experience',
    title: `ประสบการณ์: ${exp.company}`,
    text: [
      `บริษัท ${exp.company} (${exp.startDate}–${exp.endDate}, รูปแบบงาน ${exp.workModel}).`,
      `ตำแหน่ง: ${roles}.`,
      exp.summary,
      exp.responsibilities?.length ? `หน้าที่: ${exp.responsibilities.join('; ')}.` : '',
      achievements ? `ผลงาน: ${achievements}.` : '',
      exp.techStack?.length ? `เทคโนโลยี: ${exp.techStack.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  })
}

// ── 4. Projects ─────────────────────────────────────────────────
// One chunk per project — usually the highest-value chunks, because most
// recruiter questions are really "what have you built?" questions.
for (const proj of ME.projects) {
  chunks.push({
    id: `project-${proj.name}`,
    type: 'project',
    title: `โปรเจกต์: ${proj.name}`,
    text: [
      `โปรเจกต์ ${proj.name} (${proj.category}).`,
      `บทบาท: ${proj.role}.`,
      proj.description,
      `เทคโนโลยี: ${proj.techStack.join(', ')}.`,
      proj.highlights?.length ? `จุดเด่น: ${proj.highlights.join('; ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  })
}

// ── 5. Education + courses ──────────────────────────────────────
chunks.push({
  id: 'education',
  type: 'education',
  title: 'การศึกษา',
  text: ME.education
    .map((e) => `${e.degree} สาขา ${e.field}, ${e.institution} (${e.startYear}–${e.endYear}, GPA ${e.gpa}).`)
    .join(' '),
})
chunks.push({
  id: 'courses',
  type: 'courses',
  // Latin, matching the Tools & AI / DevOps & Cloud labels: a title with no
  // Latin character at all is dropped from the chat status line for English
  // readers, so this one used to vanish for them entirely. Thai renders the
  // English label as-is, which is how the other groups already read.
  title: 'Courses & Learning',
  text: `คอร์สที่เรียน: ${ME.courses.map((c) => c.name).join(', ')}. กำลังเรียนรู้: ${ME.learningNow.join(', ')}.`,
})

// ── Write output ────────────────────────────────────────────────
const outPath = join(process.cwd(), 'lib', 'me', 'chunks.json')
writeFileSync(outPath, JSON.stringify(chunks, null, 2), 'utf8')

// A small summary so you can eyeball the result immediately.
console.log(`✅ Built ${chunks.length} chunks → lib/me/chunks.json\n`)
const byType = chunks.reduce<Record<string, number>>((acc, c) => {
  acc[c.type] = (acc[c.type] ?? 0) + 1
  return acc
}, {})
console.table(byType)
const lengths = chunks.map((c) => c.text.length)
console.log(
  `chunk text length — min ${Math.min(...lengths)}, max ${Math.max(...lengths)}, avg ${Math.round(
    lengths.reduce((a, b) => a + b, 0) / lengths.length,
  )} chars`,
)
