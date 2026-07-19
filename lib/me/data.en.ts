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
      "Leads development of CRM platforms for 15+ large enterprise clients — covering everything from coding and deployment to database design and migration.",
    responsibilities: [
      "Architected and designed database schemas for both S-CRM (React SPA) and Next-S-CRM (Next.js 15) platforms",
      "Deployed and maintained production environments (Docker, Nginx, Jenkins, Kubernetes on Azure & IBM Cloud)",
      "Built shared components / cross-project code sharing — 80+ reusable UI components",
      "Planned and executed migration from legacy systems to the new platform — designing database schema, data mapping, and UX flow",
      "Led a 5-person development team with a code review culture that kept quality consistent",
      "Designed a full suite of CRM modules: Lead, Opportunity, Quotation, Sales Order, Case Management, Field Service, Work Order, Campaign, Customer 360",
      "Built real-time features with Socket.IO — chat, notifications, live updates",
      "Built a workflow automation engine for case management process steps",
      "Designed role-based access control and a visible-function system for multi-tenant deployment",
      "Integrated Azure AD SSO (MSAL) for enterprise clients",
    ],
    achievements: [
      { metric: "Delivered custom CRM platform", value: "15+ enterprise clients", context: "Well, WDC, Panel Plus, Modernform, Central Food, Millennium Auto, and more" },
      { metric: "Built S-ERP", value: "All module dashboards", context: "Full-module ERP system" },
      { metric: "Built CP-Meiji Web App", value: "Solo architect — 30+ tables, 4 doc types, multi-dept approval", context: "Designed entirely from scratch — DB schema, config-driven form engine, expression-based validation, row-level access control, Azure AD SSO, Redis caching — no template, no reference" },
      { metric: "Built Chat Assistance", value: "In-app CRM chat system", context: "Real-time Socket.IO chat + n8n chatbot + AI Agent context, increasing end-user engagement" },
      { metric: "Built Next-S-CRM", value: "Next-generation CRM", context: "Fully redesigned architecture with Next.js 15 — config-driven CRUD reducing development time by 70%" },
      { metric: "Built S-Hospitality", value: "Dynamic & Master Components", context: "Reusable components for the hospitality vertical" },
      { metric: "Full-cycle CRM", value: "90+ routes/pages", context: "Lead, Opportunity, Quotation, Sales Order, Case Management, Field Service, Work Order, Campaign, Customer 360, Dashboard, Reporting" },
      { metric: "Kubernetes deployment", value: "Azure + IBM Cloud", context: "Multi-environment CI/CD pipeline: dev, UAT, production" },
      { metric: "Landing Page Builder", value: "Marketing self-service tool", context: "Enables the marketing team to build landing pages independently, without waiting on developers" },
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
      "The company's flagship CRM platform, deployed to 14+ enterprise clients, each with its own customizations and modules. Maintained and continuously developed for 4+ years — covering Sales, Marketing, Service, Field Service, and Customer 360 in a single system.",
    role: "Developer → Lead Developer — involved from early development through leading the team; owns architecture, deployment, code review, and migration",
    highlights: [
      "Deployed to 14 enterprise clients, each with its own config and modules",
      "Maintains production environments with Docker + Nginx + Jenkins + Kubernetes (Azure & IBM Cloud)",
      "Built shared components and cross-client code sharing",
      "Planned migration from legacy systems to the new platform — not just planning, but personally designing and executing both the database schema and UX",
      "Full-cycle CRM system: Lead Management, Opportunity Pipeline, Quotation, Sales Order, Case Management, Field Service, Work Order, Campaign, Customer 360, Dashboard & Reporting",
      "Real-time features: Socket.IO chat, live notifications, calendar sync",
      "AI/Chatbot integration: Chat Assistant, AI Agent context for customer service",
      "Landing Page Builder for marketing campaigns",
      "Customer Journey tracking and Churn Rate analysis",
      "Scoring system for lead qualification",
      "Workflow automation engine for the case management process",
      "SLA management and escalation rules",
      "Google Maps integration for field service routing",
      "Multi-format reporting: Excel export, PDF viewer, Chart dashboards (Nivo, Chart.js)",
      "Role-based access control + visible function system",
      "Azure AD SSO integration for enterprise clients",
    ],
  },
  "Full-S-CRM (Next-S-CRM)": {
    description:
      "A next-generation CRM platform that fully redesigns the architecture of the original S-CRM — migrating from a React SPA to the Next.js 15 App Router, replacing raw SQL with Prisma ORM, adding a Redis session/cache layer, and introducing a config-driven CRUD system that cuts boilerplate by over 70%.",
    role: "Lead Developer & Architect — redesigned the entire architecture, built the core framework, and led the development team",
    highlights: [
      "Designed a Centralized CRUD Helper — auto audit fields, access control, transaction management, and audit logging in one place",
      "Built a Config-driven Form & Table system — new CRUD pages can be created within hours from config alone",
      "Redis-backed Transaction Management — interactive Prisma transactions via Redis keys without holding a DB connection",
      "ModelEvent System — post-write hooks that automatically trigger business logic after CRUD operations",
      "Row-level Access Control — permission-based data filtering that works automatically with the CRUD helper",
      "Expression-based Validation Engine — dynamic validation rules defined via config (filtrex expressions), CSP-compliant",
      "Multi-tenant ready — a single codebase supports multiple clients via a dynamic module system",
      "Azure AD SSO + Lucia v3 Auth — enterprise-grade authentication with PKCE flow",
      "Centralized Error Handling — logs errors to DB and auto-creates Azure Planner tasks for critical issues",
      "Reduced new-page development time from 2-3 days to 2-3 hours with a config-driven approach",
      "Developed with an AI-assisted workflow — started with Kiro (spec-driven pipeline), then moved to Claude Code (dynamic sub-agent pipeline) that routes work autonomously",
    ],
  },
  "CP-Meiji Material Request": {
    description:
      "A Material Request system for CP-Meiji, designed and built entirely from scratch — covering multi-department approval workflow, a config-driven dynamic form engine, expression-based validation, row-level access control, Azure AD SSO, and a migration plan from the legacy system. Supports 4 document types (Create, Extend, Edit, Deletion).",
    role: "Solo Architect & Full Stack Developer — independently designed the architecture, DB schema, UX flow, expression engine, access control, and migration plan; no template, no reference",
    highlights: [
      "Designed a 30+ table database schema — normalized to support dynamic fields, multi-level approval chains, and versioned material flows",
      "Built a config-driven form engine — MaterialFlow → Section → Input, where admins define fields, validation, and conditions without touching code",
      "Built a filtrex-based expression engine for dynamic validation rules: requireIf, disableIf, defaultIf — evaluated on both client and server, CSP-safe",
      "Multi-level route approval system — supports sequential and parallel department approvals, delegate managers, and auto-activation of the next level",
      "Row-level access control — dynamically separates own/full/none permission levels per user, per resource",
      "Azure AD SSO with PKCE flow + Lucia session management + Redis session store",
      "4 document types (Create/Extend/Edit/Deletion), each with its own flow and validation, managed on a single codebase",
      "Auto-generates a TXT export file for SAP once the approval chain is complete, with conversion to Master Item",
      "Redis caching layer — caches material flow config for 5 minutes to reduce redundant DB queries",
      "Event-driven architecture (ModelEvent) — post-write hooks for audit logging, notifications, and cascading updates",
      "Centralized error handling — logs every error to DB and auto-creates Azure Planner tasks for critical issues",
      "Planned migration of data from the legacy system into the new schema with zero data loss",
    ],
  },
  "S-ERP Dashboard": {
    description: "Built dashboards for an ERP system and provided consulting on recalculation logic.",
    role: "Frontend Developer — built dashboards and consulted on recalculation logic",
    highlights: [
      "Real-time ERP data dashboard",
      "Consulted on and designed recalculation logic",
      "Reusable chart/widget components",
    ],
  },
  "CRM Lead & Opportunity Management": {
    description:
      "A Lead and Opportunity pipeline management system for S-CRM — covering lead capture, qualification scoring, pipeline stages, and conversion to customer, complete with commit target tracking and sales forecasting.",
    role: "Lead Developer — designed the flow and built the entire module",
    highlights: [
      "Lead scoring system — automatically calculates scores from defined criteria",
      "Opportunity pipeline — drag & drop stages, probability tracking, expected revenue",
      "Commit target — sets monthly/quarterly targets with dashboard tracking",
      "Lead assignment rules — auto-assigns by segment, territory, round-robin",
      "Sales forecast dashboard using Nivo charts",
      "Excel import/export for bulk operations",
    ],
  },
  "CRM Case Management & Field Service": {
    description:
      "A Case Management system for after-sales service — supporting case creation, SLA tracking, process-step workflow, field service dispatch, and work order management, with Google Maps integration for routing.",
    role: "Lead Developer — designed the workflow engine and built the module",
    highlights: [
      "Case workflow engine — configurable process steps, auto-escalation, SLA countdown",
      "SLA management — defines response/resolution times by priority, with holiday calendar support",
      "Field Service module — technician dispatch, route planning with Google Maps",
      "Work Order system — checklist-based task completion, photo evidence, digital signature",
      "Email-to-Case — auto-creates cases from incoming email",
      "Case category / sub-category hierarchy for classification",
      "Report: Case tracking status, Job status tracking, Problem analysis",
      "Real-time notifications on case status changes",
    ],
  },
  "CRM Quotation & Sales Order": {
    description:
      "A Quotation and Sales Order system for S-CRM — supporting product catalog, price list management, discount rules, multi-currency, and approval workflow, with PDF generation.",
    role: "Lead Developer — designed the data model and built the module",
    highlights: [
      "Product catalog — product groups, sub-groups, UOM, price list management",
      "Quotation builder — line items, discount calculation, tax, total summary",
      "Price list groups — pricing defined by customer segment/tier",
      "Sales Order workflow — converts from quotation, includes approval process",
      "Agreement/Contract management — track contract period, renewal alerts",
      "Excel export for reporting and bulk price updates",
      "Series document — auto-generates running numbers per a defined format",
    ],
  },
  "S-Loyalty Platform": {
    description:
      "A loyalty platform covering both a member-facing app (points collection, reward redemption) and an admin back-office — bootstrapped a translation system (next-intl + DB-driven content per language) and a centralized CRUD framework the team could immediately build on. Supports multi-language CMS, role-based access control, MinIO file storage, and interactive transaction management.",
    role: "Lead Developer & Architect — bootstrapped the translation system, designed centralized CRUD + transaction management, and architected both the admin and LIFF apps",
    highlights: [
      "Bootstrapped a Translation System — next-intl + DB-driven content per language, letting admins manage languages themselves through the CMS without touching code",
      "Designed a Centralized CRUD Helper — auto audit fields (createdBy/updatedBy/createdPgm), UUID generation, nested relation handling, and transaction management in one place",
      "Interactive Transaction System — Prisma $transaction via a cookie-based transaction ID, supporting multi-step operations that can commit/rollback across API calls",
      "ModelEvent System — post-write hooks that automatically trigger business logic after create/update/delete, with preventData comparison",
      "Role-based Access Control — permission checks at the table level, including relations; canRead/canWrite per role, per table",
      "Member Authentication — Lucia Auth + Arctic OAuth for member login, session management, and OTP verification",
      "Multi-language CMS — MDX editor + ContentPerLanguage model supporting rich text content across multiple languages",
      "Admin Back-office — user management, role-menu assignment, dashboard, reporting modules",
      "MinIO File Storage — a centralized file upload/download service supporting images, documents, and QR codes",
      "Middleware Architecture — separates auth middleware into 3 layers by route pattern: admin (session), LIFF (LINE token), API (Basic Auth)",
      "FormModel Context — nested form state management supporting parent-child form hierarchies",
      "In-app Documentation — an s-document section for developer onboarding: CRUD usage, table naming conventions, deployment guide",
      "Dashboard & Reporting — overview metrics, point history analytics, member segmentation",
    ],
  },
  "S-Hospitality Config-Driven Master": {
    description:
      "Designed a component and config system for master pages that can be set up entirely through config — covering record list, small list, and form layouts.",
    role: "Developer — designed the config schema and built the components",
    highlights: [
      "Config-driven — sets up master pages without writing new UI code",
      "Covers 3 layout types: record list, small list, and form",
      "Significantly reduced the time to build new master pages",
    ],
  },
  "Chat Assistance for S-CRM": {
    description:
      "An in-app CRM chat system supporting real-time messaging between users, chatbot automation via n8n, AI Agent context for customer service, and emoji reactions — connected to workflow automation for auto-assign, auto-reply, and escalation.",
    role: "Developer — designed and built the chat module, both the frontend and the integration layer",
    highlights: [
      "Real-time chat with Socket.IO — supports 1-on-1 and group chat",
      "Connected to n8n workflow automation for auto-reply and chatbot scenarios",
      "AI Agent context — gives the AI access to customer data for accurate, on-point responses",
      "Emoji reactions and rich text messaging",
      "Chat room management — create/manage rooms, invite members, pin messages",
      "Increased engagement and reduced support team response time",
      "Quick Reply templates for common responses",
      "Unread message tracking and notification system",
    ],
  },
  "Customer Portal": {
    description:
      "A new product for managing the full support case lifecycle — from opening a case, tracking status, and reopening through to closure, with an all-in-one overview dashboard. Designed as a modular product that can be bundled with CRM customer service or used standalone. Built AI-first with Claude Code, from architecture through implementation.",
    role: "Solo Architect & Full Stack Developer — independently designed the architecture, schema, and UX flow; developed AI-first with Claude Code via an orchestrator + specialized sub-agents",
    highlights: [
      "Manages the full support case lifecycle — New case → Monitor → Reopen → Close — in one place",
      "Overview dashboard — track case status and workload from a single screen",
      "Designed as a modular product — can be bundled with CRM customer service or used standalone",
      "An orchestrator routes work to specialized sub-agents through a dynamic pipeline — developed AI-first with Claude Code",
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
    tagline: "Building systems that actually scale — with code people can actually read.",
    militaryStatus: "Exempted from military service (completed Reserve Officer Training Corps)",
  },

  summary: {
    ...rawMeData.summary,
    bio: "Lead Developer with 8+ years of experience who does far more than write code — architecting systems, designing database schemas, deploying to production, and leading teams to deliver CRM platforms for 15+ enterprise clients, from Millennium Auto to CP-Meiji. Specializes in building config-driven systems that teams can extend without waiting on a developer — full-cycle CRM platforms spanning Sales, Marketing, Service, and Field Service. Currently works AI-first, using Claude Code as a core part of the development workflow.",
    highlights: [
      "Delivered CRM platforms to 15+ enterprise clients — no two alike — spanning Sales, Marketing, Service, and Field Service",
      "Built config-driven systems that cut new-page setup time from days to hours",
      "Owns the full cycle end-to-end — architecture → development → deployment → migration",
      "Leads a team of 5 with a code review culture that keeps quality consistent",
      "Runs a Docker + Nginx + Jenkins + Kubernetes pipeline for confident, everyday deployments",
      "Full-cycle CRM with 90+ pages: Lead, Opportunity, Quotation, Case Management, Field Service, Campaign, Customer 360",
      "Real-time features: Socket.IO chat, AI chatbot, live notifications",
    ],
  },

  skills: {
    ...rawMeData.skills,
    softSkills: [
      "Config-driven System Design — systematically reducing development time",
      "Team Leadership & Code Review Culture",
      "Database Schema Design & Migration Planning",
      "Technical Consulting — translating business needs into technical solutions",
      "Cross-project Code Sharing & Reusable Architecture",
      "CRM Domain Expertise — Sales, Marketing, Service, Field Service workflows",
      "Multi-tenant SaaS Architecture Design",
      "Real-time System Design (WebSocket, Event-driven)",
      "AI-Assisted Development — primarily uses Claude Code, designing dynamic pipelines through an orchestrator that adaptively routes work to specialized sub-agents, in contrast to Kiro's linear spec-driven pipeline (spec → design → tasks); hands-on experience progressing from Copilot → Kiro → Claude Code",
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
    message: "Looking for a Lead Developer who can execute end-to-end, from architecture to production? Let's talk.",
    resumePdfUrl: "/resume-pakorn-en.pdf",
  },

  settings: {
    ...rawMeData.settings,
    language: "en" as const,
    designConcept: {
      ...rawMeData.settings.designConcept,
      philosophy:
        "Told through visual narrative — this resume isn't just a list of data, but the story of someone who started as an ordinary Programmer, grew through real projects, and became a Lead building systems for major enterprises. Every section is a chapter that gradually reveals who I am.",
      inspiration:
        "A blend of Stripe's annual letter, which tells a story through scroll; an Apple product page that reveals itself layer by layer; and a timeline-based portfolio that makes you feel like you're on the journey with the resume's owner — not just reading data, but understanding the journey.",
    },
  },
}
