/**
 * lib/me/data.en.ts — English resume data, derived from the Thai source.
 *
 * Structural / language-neutral fields (skill levels, dates, techStack, clients,
 * hobbies' icon/frequency, education years/gpa, courses, learningNow, contact,
 * workModel, teamSize, etc.) are inherited from `rawMeData` in `./data` — only
 * Thai prose fields are overridden here. Overrides are keyed by a STABLE
 * IDENTIFIER (company / project name / hobby name), never by array index, so
 * the Thai and English datasets cannot silently drift apart. Missing
 * translations throw at module load rather than leaking Thai text into the
 * English PDF.
 */

import { rawMeData } from './data'

// ──────────────────────────────────────────
//  Lookup helper — fail fast on missing translations
// ──────────────────────────────────────────

function lookup<T>(map: Record<string, T>, key: string, kind: string): T {
  const entry = map[key]
  if (!entry) {
    throw new Error(`[lib/me/data.en.ts] Missing English translation for ${kind} "${key}"`)
  }
  return entry
}

// ──────────────────────────────────────────
//  Experience overrides (keyed by company)
// ──────────────────────────────────────────

const experienceEn: Record<
  string,
  {
    summary: string
    responsibilities: string[]
    achievements: { metric: string; value: string; context: string }[]
  }
> = {
  MSC: {
    summary:
      "Joined as a Programmer in 2019, promoted to Senior in 2021, and Development Leader since 2025. Leads a team of 5 building CRM platforms for 15+ enterprise clients.",
    responsibilities: [
      "Architected and designed database schemas for both S-CRM (React SPA) and Next-S-CRM (Next.js 15)",
      "Maintained the dev, UAT, and production environments on Azure and IBM Cloud",
      "Built 80+ shared UI components reused across client projects",
      "Planned and executed migration from legacy systems, covering database schema, data mapping, and UX flow",
      "Designed many CRM modules, including Lead, Opportunity, Case, and Field Service",
      "Built real-time chat, notifications, and live updates with Socket.IO",
      "Built a workflow automation engine for case management",
      "Designed role-based access control and a visible-function system for multi-tenant deployment",
      "Integrated Azure AD SSO (MSAL) for enterprise clients",
    ],
    achievements: [
      { metric: "Built custom CRM platform", value: "15+ enterprise clients", context: "Well, WDC, Panel Plus, Modernform, Central Food, Millennium Auto, and more" },
      { metric: "Built S-ERP", value: "All module dashboards", context: "Full-module ERP system" },
      { metric: "Built CP-Meiji Web App", value: "Solo architect, 30+ tables, 4 doc types", context: "Designed and built from the ground up, with no existing system to work from" },
      { metric: "Built Chat Assistance", value: "In-app CRM chat system", context: "Socket.IO chat wired to an n8n chatbot and AI Agent context, increasing end-user engagement" },
      { metric: "Built Next-S-CRM", value: "Next-generation CRM", context: "Fully redesigned architecture on Next.js 15" },
      { metric: "Built S-Hospitality", value: "Dynamic & Master Components", context: "Reusable components for the hospitality vertical" },
      { metric: "CRM across many modules", value: "90+ routes/pages", context: "Covering Lead, Opportunity, Quotation, Field Service, and Customer 360" },
      { metric: "Kubernetes deployment", value: "Azure + IBM Cloud", context: "Multi-environment CI/CD pipeline" },
      { metric: "Landing Page Builder", value: "Marketing self-service tool", context: "Lets the marketing team build landing pages without waiting on developers" },
    ],
  },
  CDG: {
    summary:
      "Developed web applications for a government agency's examination system and royal decoration (honors) system.",
    responsibilities: [
      "Developed frontends with Vue.js and React",
      "Built backend APIs with PHP",
      "Designed and optimized SQL queries",
    ],
    achievements: [
      { metric: "Improved performance", value: "Reduced query time", context: "Optimized SQL queries for large datasets" },
      { metric: "Learned a new stack", value: "4 languages/frameworks", context: "JS, Vue, React, PHP within the first year" },
    ],
  },
}

// ──────────────────────────────────────────
//  Project overrides (keyed by project name)
// ──────────────────────────────────────────

const projectsEn: Record<string, { description: string; role: string; highlights: string[] }> = {
  "S-CRM Platform": {
    description:
      "The company's flagship CRM platform, deployed to 15+ enterprise clients, each with its own customizations and modules. Maintained and continuously developed for over 4 years.",
    role: "Joined as a Developer and grew into Lead Developer, owning architecture, deployment, code review, and migration",
    highlights: [
      "15+ enterprise clients run on one codebase, onboarded by configuration rather than a code fork, and it has been in production for over 4 years",
      "Every client runs its own config and modules off a single shared codebase",
      "Maintains production on Docker, Nginx, Jenkins, and Kubernetes across Azure and IBM Cloud",
      "Built shared components and cross-client code sharing",
      "Migrated legacy systems onto the platform, designing and executing both the database schema and the UX personally",
      "Customer Journey tracking and Churn Rate analysis",
      "Multi-format reporting: Excel export, PDF viewer, and chart dashboards (Nivo, Chart.js)",
      "Role-based access control and a visible function system",
      "Azure AD SSO for enterprise clients",
      "Landing Page Builder the marketing team runs themselves",
    ],
  },
  "Full-S-CRM (Next-S-CRM)": {
    description:
      "A next-generation CRM that fully redesigns the architecture of the original S-CRM, moving from a React SPA to the Next.js 15 App Router, replacing raw SQL with Prisma ORM, adding a Redis session and cache layer, and introducing a config-driven CRUD system that cuts boilerplate by over 70%.",
    role: "Lead Developer & Architect. Redesigned the architecture, built the core framework, and led the development team",
    highlights: [
      "Cut boilerplate by over 70%, taking a new CRUD page from 2-3 days down to 2-3 hours",
      "A centralized CRUD helper that handles audit fields, access control, transactions, and audit logging in one place",
      "Config-driven forms and tables, so a new CRUD page can be built in hours from config alone",
      "Interactive Prisma transactions keyed through Redis, so no DB connection is held open",
      "ModelEvent post-write hooks that trigger business logic automatically after every write",
      "Row-level access control that filters data by permission through the CRUD helper",
      "A filtrex expression engine for validation rules defined in config, CSP-compliant",
      "One codebase serving multiple clients through a dynamic module system",
      "Azure AD SSO wired to Lucia v3 Auth with PKCE flow",
      "Centralized error handling that logs to the database and opens an Azure Planner task for critical issues",
      "Built with an AI-assisted workflow using Kiro and Claude Code",
    ],
  },
  "CP-Meiji Material Request": {
    description:
      "A Material Request system for CP-Meiji that I designed and built from the ground up, covering multi-department approval workflow, a config-driven form engine, migration from the legacy system, and four document types (Create, Extend, Edit, Deletion).",
    role: "Solo Architect & Full Stack Developer, looking after the architecture, DB schema, UX flow, expression engine, access control, and migration plan myself, with no existing system to work from",
    highlights: [
      "Fully replaced the legacy system with no data loss, moved form setup into the hands of admins who add and change fields without waiting on a developer, and pushes data into SAP automatically once approval completes",
      "A 30+ table schema normalized for dynamic fields, multi-level approval chains, and versioned material flows",
      "A config-driven form engine (MaterialFlow → Section → Input) where admins define fields, validation, and conditions without touching code",
      "A filtrex expression engine for requireIf, disableIf, and defaultIf rules, evaluated on both client and server, CSP-safe",
      "Route approval across multiple levels, supporting sequential and parallel department sign-off, delegate managers, and auto-activation of the next level",
      "Permission split into own, full, and none per user and per resource",
      "Azure AD SSO with PKCE flow, Lucia session management, and a Redis session store",
      "Four document types, each with its own flow and validation, running on a single codebase",
      "Generates a TXT export for SAP once the approval chain completes, then converts it to a Master Item",
      "Caches material flow config in Redis for 5 minutes to cut repeated DB queries",
      "Migrated data from the legacy system into the new schema with zero data loss",
    ],
  },
  "S-ERP Dashboard": {
    description: "Built dashboards for an ERP system and advised on recalculation logic.",
    role: "Frontend Developer building dashboards and advising on recalculation logic",
    highlights: [
      "Gives users live ERP figures on one screen, and the chart components built here were reused across other modules",
      "Real-time ERP data dashboard",
      "Consulted on and designed recalculation logic",
      "Reusable chart/widget components",
    ],
  },
  "CRM Core Modules (S-CRM)": {
    description:
      "The core modules of S-CRM, designed and built in-house, handling a wide range of work across lead capture, sales, and after-sales service.",
    role: "Lead Developer. Designed the data model and workflow engine, and built every module",
    highlights: [
      "Helped move manual work into the system, from lead scoring and routing to opening cases from email and counting SLA, so sales and service can work off the same record from first contact through after-sales",
      "Lead scoring that calculates automatically, with assignment rules by segment, territory, or round-robin",
      "An opportunity pipeline with draggable stages, probability tracking, expected revenue, and monthly and quarterly commit targets",
      "Sales forecast dashboard built on Nivo",
      "A quotation builder with line items, discounts, tax, and price lists by customer segment or tier",
      "Sales Orders that convert from a quotation, run through approval, and take a running number by series",
      "Agreement management that tracks contract periods and alerts before renewal",
      "A case workflow engine with configurable process steps, auto-escalation, and an SLA countdown that respects priority and the holiday calendar",
      "Field Service that dispatches technicians, plans routes with Google Maps, and closes work orders with checklists, photo evidence, and digital signatures",
      "Email-to-Case, which opens a case from incoming email and notifies in real time",
      "Excel import and export for bulk operations and reporting",
    ],
  },
  "S-Loyalty Platform": {
    description:
      "A loyalty platform with both a member-facing app (points, reward redemption) and an admin back-office. Came in to bootstrap the translation system and a centralized CRUD framework the team could immediately build on.",
    role: "Lead Developer & Architect. Bootstrapped the translation system, designed centralized CRUD and transaction management, and architected both the admin and LIFF apps",
    highlights: [
      "Gave the team a foundation they could build on immediately, and turned adding a language into an admin task in the CMS rather than a developer task",
      "A translation system on next-intl with per-language content in the database, so admins manage languages through the CMS without touching code",
      "Interactive transactions that tie Prisma $transaction to a transaction ID in a cookie, so multi-step work can commit or roll back across API calls",
      "A CRUD helper that fills in audit fields, generates UUIDs, and handles nested relations",
      "Permission checks down to the table and its included relations, with canRead and canWrite per role",
      "Member login on Lucia Auth with Arctic OAuth and OTP verification",
      "A multi-language CMS built on an MDX editor over a ContentPerLanguage model",
      "A back-office covering user management, role-menu assignment, dashboards, and reporting",
      "A central MinIO file service for images, documents, and QR codes",
      "Auth middleware split into three layers by route pattern: session for admin, LINE token for LIFF, Basic Auth for the API",
      "A FormModel context that manages state for nested parent-child forms",
      "In-app documentation so new developers can onboard quickly, covering CRUD usage, naming conventions, and deployment",
      "Dashboards for point history and member segmentation",
    ],
  },
  "S-Hospitality Config-Driven Master": {
    description:
      "A component and config system for master pages that can be set up entirely through config, covering record list, small list, and form layouts.",
    role: "Developer. Designed the config schema and built the components",
    highlights: [
      "A new master page becomes a config entry instead of fresh UI code, so the team adds pages without touching components",
      "Sets up master pages without writing new UI code",
      "Covers three layouts: record list, small list, and form",
      "Significantly reduced the time to build new master pages",
    ],
  },
  "Chat Assistance for S-CRM": {
    description:
      "An in-app CRM chat system that wires real-time messaging into workflow automation for auto-assign, auto-reply, and escalation.",
    role: "Developer. Designed and built the chat module, both the frontend and the integration layer",
    highlights: [
      "Brought customer conversations inside the CRM, so support replies from the same screen as the customer record, and repeat questions are auto-answered through n8n instead of typed out",
      "Real-time chat on Socket.IO for both one-to-one and group conversations",
      "Connected to n8n workflow automation for auto-reply and chatbot scenarios",
      "Gives the AI Agent access to customer data so replies land on point",
      "Emoji reactions and rich text messaging",
      "Room management covering creation, member invites, and pinned messages",
      "Quick Reply templates for common responses",
      "Unread message tracking with notifications",
      "Cut the support team's response time",
    ],
  },
  "Customer Portal": {
    description:
      "A new product for managing support cases from opening and status tracking through reopening to closure. Built as a modular product that can be bundled with CRM customer service or sold standalone.",
    role: "Solo Architect & Full Stack Developer. Designed the architecture, schema, and UX flow alone, and built it with Claude Code",
    highlights: [
      "Opened up a separately sellable product, so a customer who only needs support tooling does not have to buy the whole CRM",
      "Handles the whole case lifecycle in one place: New case, Monitor, Reopen, Close",
      "A dashboard that shows case status and workload on a single screen",
      "Modular by design, so it works bundled or on its own",
    ],
  },

  "Resume RAG Assistant": {
    description:
      "A RAG system that answers questions about my experience in real time, live at resume.kurpakorn.com. I built every layer myself: chunking, embeddings, vector retrieval, the agent loop, SSE streaming, and an evaluation harness that measures hallucination.",
    role: "Solo Architect & Developer. Designed and built the whole system, including the evaluation harness",
    highlights: [
      "Real RAG instead of stuffing the whole CV into the prompt. The model calls a searchResume tool and pulls back only the relevant chunks, so the content can grow without hitting context limits",
      "Asymmetric embedding: chunks are embedded as RETRIEVAL_DOCUMENT and questions as RETRIEVAL_QUERY, using gemini-embedding-001 constrained to 768 dimensions to match the column",
      "Vector search on pgvector using cosine distance to return the nearest top-k, with a pooled singleton connection so load cannot exhaust Postgres",
      "Agent loop bounded with stepCountIs, and a deliberate split between what belongs in the system prompt and what should be retrieved at runtime",
      "Fixed the dead air on the first token, 6.9 seconds locally and 11.5 in production, by reading the full stream rather than only the text stream and forwarding every tool call event as its own SSE frame, turning the wait into visible progress",
      "Sends an empty comment frame the moment the connection opens so proxies do not drop it while idle, plus a non-streaming fallback for proxies that strip SSE",
      "Retrieval eval measuring Hit@K and MRR, so I can tell whether the correct chunk ranks first rather than merely appearing in top-k",
      "Answer eval as LLM-as-judge measuring groundedness. The judge sees only the question, the retrieved chunks, and the answer, and is barred from using its own knowledge. Verdicts come back as validated JSON",
      "The eval set is split into easy, ambiguous, and adversarial buckets, where the adversarial bucket tests whether the bot admits it does not know instead of inventing experience",
      "It is a public endpoint, so it carries rate limits keyed on both IP and visitor, fingerprint cookies, IP blocklisting, schema validation on every request, and full Thai and English support",
    ],
  },
}

// ──────────────────────────────────────────
//  Hobby name overrides (keyed by Thai name)
// ──────────────────────────────────────────

const hobbiesEn: Record<string, string> = {
  "เวทเทรนนิ่ง": "Weight Training",
  "ดูบอล": "Football",
  "เทนนิส": "Tennis",
  "แบดมินตัน": "Badminton",
  "เดินป่า": "Hiking",
  "วิ่ง": "Running",
  "เล่นเกม": "Gaming",
  // Boxing / Onsen are already English in rawMeData — left untranslated below.
}

// ──────────────────────────────────────────
//  English dataset
// ──────────────────────────────────────────

export const rawMeDataEn = {
  ...rawMeData,

  profile: {
    ...rawMeData.profile,
    tagline: "I build systems that scale, and write code my teammates can pick up without asking me.",
    militaryStatus: "Exempted from military service (completed Reserve Officer Training Corps)",
  },

  summary: {
    ...rawMeData.summary,
    bio: "Hi, I am a Lead Developer with 8 years of experience. My work spans architecture, database schema design, production deployment, and leading a team building CRM platforms for 15+ enterprise clients such as Millennium Auto and CP-Meiji. What I enjoy most is building config-driven systems that teams can extend without waiting on a developer, and these days I work AI-first with Claude Code and build AI systems myself. This whole site is a RAG system I built end to end, from chunking and embeddings through vector retrieval and the agent loop to an evaluation harness that measures hallucination.",
    highlights: [
      "Built CRM platforms for 15+ enterprise clients, each with its own configuration",
      "Built config-driven systems that brought new-page work down from 2-3 days to 2-3 hours",
      "Owns the whole cycle: architecture, development, deployment, migration",
      "Leads a team of 5 and set up a code review culture that helps keep quality consistent",
      "Runs CI/CD on Docker, Nginx, Jenkins, and Kubernetes across Azure and IBM Cloud",
      "CRM across 90+ pages, covering Lead, Opportunity, and on to Customer 360",
      "Real-time on Socket.IO: chat, AI chatbot, live notifications",
      "Built a RAG system on pgvector end to end, with evals covering both retrieval (Hit@K, MRR) and answer groundedness",
    ],
  },

  skills: {
    ...rawMeData.skills,
    softSkills: [
      "Config-driven System Design",
      "Team Leadership & Code Review Culture",
      "Database Schema Design & Migration Planning",
      "Translating business requirements into technical solutions",
      "Cross-project Code Sharing & Reusable Architecture",
      "CRM Domain Expertise (Sales, Marketing, Service, Field Service)",
      "Multi-tenant SaaS Architecture Design",
      "Real-time System Design (WebSocket, Event-driven)",
      "AI-Assisted Development with Claude Code",
      "RAG Architecture (chunking, embedding, vector retrieval)",
      "LLM Agent & Tool-Calling Design",
      "RAG Evaluation (Hit@K, MRR, LLM-as-judge groundedness)",
      "Hallucination Testing & Guardrails",
    ],
  },

  experience: rawMeData.experience.map((exp) => ({
    ...exp,
    ...lookup(experienceEn, exp.company, "experience"),
  })),

  projects: rawMeData.projects.map((proj) => ({
    ...proj,
    ...lookup(projectsEn, proj.name, "project"),
  })),

  education: rawMeData.education.map((edu) => ({
    ...edu,
    institution: "Eastern Asia University",
    degree: "Bachelor of Engineering",
    field: "Computer Engineering",
  })),

  hobbies: rawMeData.hobbies.map((hobby) => ({
    ...hobby,
    name: hobbiesEn[hobby.name] ?? hobby.name,
  })),

  cta: {
    ...rawMeData.cta,
    message: "Looking for a Lead Developer who can take a project from architecture all the way to production? Let's talk.",
    resumePdfUrl: "/resume-pakorn-en.pdf",
  },

  settings: {
    ...rawMeData.settings,
    language: "en" as const,
    designConcept: {
      ...rawMeData.settings.designConcept,
      philosophy:
        "Told through visual narrative. The story of someone who started as an ordinary Programmer, grew through real projects, and became a Lead building systems for major enterprises. Every section is a chapter that gradually reveals who I am.",
      inspiration:
        "A blend of Stripe's annual letter, which tells a story through scroll; an Apple product page that reveals itself layer by layer; and a timeline-based portfolio that makes you feel like you are on the journey with the resume's owner.",
    },
  },
}
