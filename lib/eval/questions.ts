/**
 * lib/eval/questions.ts — the fixed evaluation set for the resume RAG chatbot.
 *
 * An eval is only as honest as its question set. This one is designed in THREE
 * deliberate buckets so the harness exercises different failure modes:
 *
 *   'easy'        — one clearly-correct chunk. Tests basic retrieval accuracy.
 *   'ambiguous'   — several chunks are legitimately correct (the CRM-project
 *                   cluster, whose embeddings sit ~0.55-0.69 apart). Tests
 *                   whether retrieval ranks ANY right answer highly, not just
 *                   one exact id — so `expectedChunkIds` holds all acceptable ids.
 *   'adversarial' — NO chunk answers it (out of corpus). Retrieval always
 *                   returns *something* (top-k is never empty), so these don't
 *                   measure retrieval — they measure HALLUCINATION resistance in
 *                   the answer eval: does the bot correctly say "I don't have
 *                   that" instead of inventing experience? `expectedChunkIds` is
 *                   empty and `shouldDecline: true`.
 *
 * expectedChunkIds must match real ids in lib/me/chunks.json.
 */

export interface EvalQuestion {
  id: string
  question: string
  category: 'easy' | 'ambiguous' | 'adversarial'
  /** Chunk ids that would correctly answer this. Empty for adversarial. */
  expectedChunkIds: string[]
  /** For adversarial: the bot should decline / say it lacks the info. */
  shouldDecline?: boolean
}

export const EVAL_QUESTIONS: EvalQuestion[] = [
  // ── easy: single clear target ──────────────────────────────────
  { id: 'q-languages', question: 'ถนัดภาษาโปรแกรมอะไรบ้าง', category: 'easy', expectedChunkIds: ['skills-ภาษาโปรแกรม'] },
  { id: 'q-databases', question: 'ใช้ฐานข้อมูลอะไรได้บ้าง', category: 'easy', expectedChunkIds: ['skills-ฐานข้อมูล'] },
  { id: 'q-devops', question: 'ถนัด Docker กับ Kubernetes แค่ไหน', category: 'easy', expectedChunkIds: ['skills-DevOps & Cloud'] },
  { id: 'q-education', question: 'เรียนจบอะไรมา', category: 'easy', expectedChunkIds: ['education'] },
  { id: 'q-courses', question: 'เคยเรียนคอร์สอะไรมาบ้าง', category: 'easy', expectedChunkIds: ['courses'] },
  { id: 'q-msc', question: 'ทำงานที่ MSC ตำแหน่งอะไรบ้าง', category: 'easy', expectedChunkIds: ['experience-MSC'] },
  { id: 'q-cdg', question: 'เคยทำงานที่ CDG ทำอะไร', category: 'easy', expectedChunkIds: ['experience-CDG'] },
  { id: 'q-cpmeiji', question: 'เล่าโปรเจกต์ CP-Meiji หน่อย', category: 'easy', expectedChunkIds: ['project-CP-Meiji Material Request'] },
  { id: 'q-loyalty', question: 'เคยทำระบบสะสมแต้ม loyalty ไหม', category: 'easy', expectedChunkIds: ['project-S-Loyalty Platform'] },

  // ── ambiguous: multiple correct chunks ─────────────────────────
  {
    id: 'q-crm-projects',
    question: 'เคยทำโปรเจกต์ CRM อะไรมาบ้าง',
    category: 'ambiguous',
    expectedChunkIds: [
      'project-S-CRM Platform',
      'project-Full-S-CRM (Next-S-CRM)',
      'project-CRM Lead & Opportunity Management',
      'project-CRM Case Management & Field Service',
      'project-CRM Quotation & Sales Order',
    ],
  },
  {
    id: 'q-approval',
    question: 'เคยทำระบบ approval workflow หลายขั้นที่ไหน',
    category: 'ambiguous',
    expectedChunkIds: ['project-CP-Meiji Material Request', 'project-CRM Case Management & Field Service'],
  },
  {
    id: 'q-nextjs',
    question: 'ใช้ Next.js กับโปรเจกต์ไหนบ้าง',
    category: 'ambiguous',
    expectedChunkIds: [
      'project-Full-S-CRM (Next-S-CRM)',
      'project-CP-Meiji Material Request',
      'project-Customer Portal',
      'project-S-Loyalty Platform',
    ],
  },

  // ── adversarial: out of corpus → must decline, not hallucinate ──
  { id: 'q-blockchain', question: 'เคยพัฒนา blockchain หรือ smart contract ไหม', category: 'adversarial', expectedChunkIds: [], shouldDecline: true },
  { id: 'q-mobilegame', question: 'เคยทำเกมมือถือขายใน App Store ไหม', category: 'adversarial', expectedChunkIds: [], shouldDecline: true },
]
