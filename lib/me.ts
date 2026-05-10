/**
 * lib/me.ts — Single source of truth for resume data
 * Zod schemas + TypeScript types + validated ME singleton
 */

import { z } from 'zod'

// ──────────────────────────────────────────
//  Zod Schemas
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
  profileImage: z.string().min(1),
  location: z.string().min(1),
})

export const ContactSchema = z.object({
  email: z.string().min(1),
  phone: z.string().min(1),
  linkedin: z.string(),
  website: z.string(),
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
  languages: z.array(SkillSchema),
  frameworks: z.array(SkillSchema),
  databases: z.array(SkillSchema),
  devops: z.array(SkillSchema),
  tools: z.array(SkillSchema),
  softSkills: z.array(z.string().min(1)),
})

export const ExperienceRoleSchema = z.object({
  title: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
})

export const ExperienceAchievementSchema = z.object({
  metric: z.string(),
  value: z.string(),
  context: z.string(),
})

export const ExperienceSchema = z.object({
  company: z.string().min(1),
  companyUrl: z.string().optional(),
  location: z.string().optional(),
  workModel: z.enum(['onsite', 'remote', 'hybrid']),
  startDate: z.string(),
  endDate: z.string(),
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
  repoUrl: z.string().optional(),
  liveUrl: z.string().optional(),
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
  resumePdfUrl: z.string(),
  qrCodeImage: z.string(),
  availableForHire: z.boolean(),
  preferredContact: z.string(),
})

export const CourseSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  year: z.number().int().min(2000).max(2100).optional(),
})

export const SettingsSchema = z.object({
  theme: z.enum(['dark', 'light']),
  accentColor: z.string().min(1),
  fontFamily: z.string().min(1),
  showProgressBar: z.boolean(),
  enableAnimations: z.boolean(),
  language: z.enum(['th', 'en']),
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
//  TypeScript Types (inferred from Zod)
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
export type Settings = z.infer<typeof SettingsSchema>
export type MeData = z.infer<typeof MeDataSchema>

// ──────────────────────────────────────────
//  Raw Data (from me.js)
// ──────────────────────────────────────────

const rawMeData = {
  profile: {
    firstName: "Pakorn",
    firstNameTH: "ปกร",
    lastName: "Chaowanaprasert",
    lastNameTH: "เชาวนประเสริฐ",
    nickname: "Kur",
    nicknameTH: "เกื้อ",
    title: "Lead Developer",
    tagline: "สร้างระบบที่ scale ได้จริง ด้วย code ที่คนอ่านรู้เรื่อง",
    profileImage: "assets/profile",
    location: "Bangna Bangkok, Thailand",
  },

  contact: {
    email: "patapuputapa@gmail.com",
    phone: "0885797989",
    linkedin: "coming soon",
    website: "coming soon",
  },

  summary: {
    bio: "Lead Developer 8+ ปี ที่ไม่ได้แค่เขียน code — แต่ออกแบบ architecture, วาง database schema, deploy production และนำทีมส่งมอบ CRM platform ให้องค์กรกว่า 15 ราย ตั้งแต่ Millennium Auto ถึง CP-Meiji ถนัดสร้างระบบ config-driven ที่ทีมต่อยอดได้โดยไม่ต้องรอ dev",
    yearsOfExperience: 8,
    highlights: [
      "ส่งมอบ CRM platform ให้ 15+ องค์กร — ไม่มีงานไหนเหมือนกัน",
      "สร้าง config-driven system ที่ลดเวลา setup หน้าใหม่จากวันเหลือชั่วโมง",
      "ดูแล full cycle เอง — architecture → dev → deploy → migration",
      "นำทีม 5 คน พร้อม code review culture ที่ทำให้ quality คงที่",
      "Docker + Nginx + Jenkins pipeline ที่ deploy ได้มั่นใจทุกวัน",
    ],
  },

  skills: {
    languages: [
      { name: "JavaScript", level: 90 },
      { name: "TypeScript", level: 80 },
      { name: "PHP", level: 60 },
    ],
    frameworks: [
      { name: "React", level: 90 },
      { name: "Next.js", level: 85 },
      { name: "Node.js", level: 80 },
      { name: "Vue.js", level: 65 },
      { name: "Prisma", level: 80 },
    ],
    databases: [
      { name: "PostgreSQL", level: 85 },
      { name: "MySQL", level: 70 },
      { name: "Redis", level: 85 },
    ],
    devops: [
      { name: "Docker", level: 80 },
      { name: "Nginx", level: 75 },
      { name: "Jenkins", level: 70 },
    ],
    tools: [
      { name: "Git", level: 90 },
      { name: "n8n", level: 75 },
      { name: "Figma", level: 60 },
    ],
    softSkills: [
      "Config-driven System Design — ลด dev time อย่างเป็นระบบ",
      "Team Leadership & Code Review Culture",
      "Database Schema Design & Migration Planning",
      "Technical Consulting — แปลง business need เป็น technical solution",
      "Cross-project Code Sharing & Reusable Architecture",
    ],
  },

  experience: [
    {
      company: "MSC",
      companyUrl: "",
      location: "",
      workModel: "remote" as const,
      startDate: "2019-09",
      endDate: "present",
      roles: [
        { title: "Development Leader", startDate: "2023-01", endDate: "present" },
        { title: "Senior Programmer", startDate: "2021-01", endDate: "2023-12" },
        { title: "Programmer", startDate: "2019-09", endDate: "2021-01" },
      ],
      teamSize: 5,
      summary: "นำทีมพัฒนา CRM platform ให้ลูกค้าองค์กรขนาดใหญ่กว่า 15 ราย ครอบคลุมตั้งแต่ coding, deployment, database design จนถึง migration",
      responsibilities: [
        "ออกแบบ architecture และ database schema สำหรับ CRM platform",
        "Deploy และดูแล production environment (Docker, Nginx, Jenkins)",
        "สร้าง shared components / code sharing ข้าม projects",
        "วาง migration plan ย้ายระบบเก่าเข้า platform ใหม่ — ไม่ใช่แค่วาง แต่ design และทำเองด้วยทั้ง database schema และ UX",
        "Lead ทีม dev และ review code",
      ],
      achievements: [
        { metric: "ส่งมอบ Custom CRM platform", value: "15+ ลูกค้าองค์กร", context: "Well, WDC, Panel Plus, Modernform, Central Food, Millennium Auto ฯลฯ" },
        { metric: "พัฒนา S-ERP", value: "All module dashboards", context: "ระบบ ERP ครบทุก module" },
        { metric: "สร้าง CP-Meiji Web App", value: "Solo design & build from scratch", context: "ออกแบบเองทั้งหมด — DB schema, UX, expression engine, migration plan — ไม่มี template ไม่มี reference" },
        { metric: "สร้าง Chat Assistance", value: "ระบบ chat ใน CRM", context: "เพิ่ม engagement ของ end-user" },
        { metric: "พัฒนา Next-S-CRM", value: "CRM generation ใหม่", context: "ปรับ architecture ใหม่ทั้งหมดด้วย Next.js" },
        { metric: "สร้าง S-Hospitality", value: "Dynamic & Master Components", context: "reusable components สำหรับสาย hospitality" },
      ],
      clients: [
        "Well", "WDC", "Peneak", "Panel Plus", "Modernform", "Enraf",
        "CSH", "Central Food", "Traphet", "TBC", "T-Life", "T-Mill",
        "CP-Meiji", "Millennium Auto",
      ],
      techStack: ["JavaScript", "React", "Next.js", "n8n", "PostgreSQL", "Prisma", "Docker", "Nginx", "Jenkins", "Git"],
    },
    {
      company: "CDG",
      companyUrl: "",
      location: "",
      workModel: "onsite" as const,
      startDate: "2017-11",
      endDate: "2019-04",
      roles: [
        { title: "Programmer", startDate: "2017-11", endDate: "2019-04" },
      ],
      summary: "พัฒนา web application สำหรับระบบสอบและระบบเครื่องราชอิสริยาภรณ์ของหน่วยงานรัฐ",
      responsibilities: [
        "พัฒนา frontend ด้วย Vue.js และ React",
        "เขียน backend API ด้วย PHP",
        "ออกแบบและ optimize SQL queries",
      ],
      achievements: [
        { metric: "ปรับ performance", value: "ลด query time", context: "optimize SQL queries สำหรับข้อมูลขนาดใหญ่" },
        { metric: "เรียนรู้ stack ใหม่", value: "4 ภาษา/frameworks", context: "JS, Vue, React, PHP ภายในปีแรก" },
      ],
      clients: [],
      techStack: ["PHP", "JavaScript", "Vue.js", "React", "MySQL", "Git"],
    },
  ],

  projects: [
    {
      name: "S-CRM Platform",
      category: "CRM Platform",
      description: "CRM platform หลักของบริษัทที่ deploy ให้ลูกค้าองค์กรกว่า 14 ราย แต่ละรายมี customization และ module ที่แตกต่างกัน ดูแลและพัฒนาต่อเนื่องมากกว่า 4 ปี",
      role: "Developer → Lead Developer — ร่วมพัฒนาตั้งแต่ต้นจนถึงนำทีม",
      techStack: ["React", "JavaScript", "PostgreSQL", "Redis", "Docker", "Nginx", "Jenkins"],
      repoUrl: "",
      liveUrl: "",
      image: "",
      highlights: [
        "Deploy ให้ลูกค้าองค์กร 14 ราย แต่ละรายมี config และ module เป็นของตัวเอง",
        "ดูแล production environment ด้วย Docker + Nginx + Jenkins",
        "สร้าง shared component และ code sharing ข้าม client projects",
        "วาง migration plan ย้ายระบบเก่าเข้า platform ใหม่ — ไม่ใช่แค่วาง แต่ design และทำเองด้วยทั้ง database schema และ UX",
      ],
    },
    {
      name: "Next-S-CRM",
      category: "CRM Platform",
      description: "CRM platform generation ใหม่ที่ปรับ architecture ทั้งหมด รองรับ multi-tenant และ customization ต่อลูกค้าแต่ละราย",
      role: "Lead Developer — ออกแบบ architecture และนำทีมพัฒนา",
      techStack: ["Next.js", "React", "JavaScript", "PostgreSQL", "Prisma", "Redis", "Docker", "Nginx"],
      repoUrl: "",
      liveUrl: "",
      image: "",
      highlights: [
        "Multi-tenant architecture รองรับลูกค้าหลายรายบน codebase เดียว",
        "Dynamic module system — เปิด/ปิด feature ต่อลูกค้าได้",
        "ปรับ performance จาก legacy CRM อย่างมีนัยสำคัญ",
      ],
    },
    {
      name: "CP-Meiji Material Request",
      category: "Custom Web App",
      description: "ระบบ Material Request สำหรับ CP-Meiji ที่ design และ build เองทั้งหมดตั้งแต่ศูนย์ — ออกแบบ database schema, UX flow, expression engine สำหรับ dynamic calculation และวาง migration plan ย้ายข้อมูลจากระบบเดิม",
      role: "Solo Designer & Full Stack Developer — design DB schema, UX, expression engine และ migration plan ด้วยตัวเอง",
      techStack: ["Next.js", "React", "JavaScript", "PostgreSQL", "Prisma", "Redis", "Docker", "Nginx"],
      repoUrl: "",
      liveUrl: "",
      image: "",
      highlights: [
        "ออกแบบ database schema เองทั้งหมด — normalize ให้รองรับ dynamic field และ multi-level approval",
        "สร้าง expression engine สำหรับ dynamic calculation ที่ user กำหนด formula ได้เอง",
        "Design UX flow ครบวงจร — ตั้งแต่ request creation, approval chain จนถึง reporting",
        "วาง migration plan ย้ายข้อมูลจากระบบเดิมเข้า schema ใหม่โดยไม่สูญเสียข้อมูล",
        "Dynamic form engine — สร้าง form ได้จาก config โดยไม่ต้องแก้ code",
        "Master data management ครบวงจร พร้อม import/export",
      ],
    },
    {
      name: "S-ERP Dashboard",
      category: "ERP System",
      description: "พัฒนา dashboard สำหรับระบบ ERP และให้คำปรึกษาด้าน recalculation logic",
      role: "Frontend Developer — พัฒนา dashboard และ consult recal logic",
      techStack: ["React", "JavaScript", "PostgreSQL", "n8n"],
      repoUrl: "",
      liveUrl: "",
      image: "",
      highlights: [
        "Dashboard แสดงข้อมูล ERP แบบ real-time",
        "ให้คำปรึกษาและออกแบบ recalculation logic",
        "Reusable chart/widget components",
      ],
    },
    {
      name: "S-Hospitality Config-Driven Master",
      category: "Component System",
      description: "ออกแบบ component และ config system สำหรับหน้า master ให้ setup ได้ผ่าน config ล้วน ครอบคลุม record list, small list และ form",
      role: "Developer — ออกแบบ config schema และพัฒนา components",
      techStack: ["Next.js", "React", "JavaScript"],
      repoUrl: "",
      liveUrl: "",
      image: "",
      highlights: [
        "Config-driven — setup หน้า master ได้โดยไม่ต้องเขียน UI code ใหม่",
        "ครอบคลุม 3 รูปแบบ: record list, small list และ form",
        "ลดเวลาสร้างหน้า master ใหม่อย่างมีนัยสำคัญ",
      ],
    },
    {
      name: "Chat Assistance for S-CRM",
      category: "Feature / Integration",
      description: "ระบบ chat ในตัว CRM เชื่อมต่อกับ workflow automation ผ่าน n8n",
      role: "Developer — ออกแบบและพัฒนา chat module",
      techStack: ["React", "n8n", "WebSocket", "PostgreSQL"],
      repoUrl: "",
      liveUrl: "",
      image: "",
      highlights: [
        "Real-time chat ด้วย WebSocket",
        "เชื่อมต่อ n8n workflow automation",
        "เพิ่ม engagement และลด response time ของ support team",
      ],
    },
  ],

  education: [
    {
      institution: "อีสเทิร์นเอเชีย",
      degree: "วิศวกรรมศาสตรบัณฑิต",
      field: "วิศวกรรมคอมพิวเตอร์",
      startYear: 2012,
      endYear: 2017,
      gpa: 2.99,
    },
  ],

  courses: [
    { name: "n8n Workflow Automation", provider: "MSC (In-house)" },
    { name: "Kiro AI-Powered IDE", provider: "MSC (In-house)" },
    { name: "AI-Assisted Development Workflow", provider: "Self-study" },
  ],

  learningNow: ["AI-Assisted Development (Claude Code, Kiro)", "System Design Patterns", "Platform Engineering"],

  hobbies: [
    { name: "เวทเทรนนิ่ง", icon: "🏋️", frequency: 5 },
    { name: "ดูบอล", icon: "⚽", frequency: 3 },
    { name: "เทนนิส", icon: "🎾", frequency: 3 },
    { name: "Boxing", icon: "🥊", frequency: 3 },
    { name: "Onsen", icon: "♨️", frequency: 3 },
    { name: "แบดมินตัน", icon: "🏸", frequency: 2 },
    { name: "เดินป่า", icon: "🥾", frequency: 2 },
    { name: "วิ่ง", icon: "🏃", frequency: 2 },
    { name: "เล่นเกม", icon: "🎮", frequency: 1 },
  ],

  cta: {
    message: "กำลังมองหา Lead Developer ที่ลงมือทำได้ตั้งแต่ architecture ถึง production? มาคุยกันครับ",
    resumePdfUrl: "/resume-pakorn.pdf",
    qrCodeImage: "",
    availableForHire: true,
    preferredContact: "email",
  },

  settings: {
    theme: "dark" as const,
    accentColor: "#4FC3F7",
    fontFamily: "Inter",
    showProgressBar: true,
    enableAnimations: true,
    language: "th" as const,
  },
}

// ──────────────────────────────────────────
//  Validated ME singleton
// ──────────────────────────────────────────

export const ME: MeData = MeDataSchema.parse(rawMeData)
