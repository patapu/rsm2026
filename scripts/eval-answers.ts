/**
 * scripts/eval-answers.ts — Phase 4b: ANSWER / GROUNDEDNESS eval (LLM-as-judge).
 *
 * Retrieval eval proved the right chunks come back. This proves the AGENT then
 * uses them honestly. For each question we:
 *   1. Run the real agent (generateText + searchResume), capturing BOTH the
 *      final answer AND exactly which chunks the tool retrieved during the run.
 *   2. Ask a SECOND model (the "judge") to score the answer — using generateObject
 *      so the verdict comes back as validated structured JSON, not free text.
 *
 * KEY teaching point — what the judge is (and isn't) allowed to see:
 *   The judge is given ONLY the question + the retrieved context + the answer.
 *   It must NOT use its own world knowledge. That's the whole trick of a
 *   groundedness eval: we're not asking "is this answer true?" (that needs
 *   ground truth) — we're asking "is every claim SUPPORTED BY WHAT WAS
 *   RETRIEVED?" A confident answer built on nothing retrieved = hallucination,
 *   even if it happens to be true.
 *
 * Adversarial questions retrieve nothing relevant, so a good answer DECLINES.
 * The judge flags `declined` so we can check that against `shouldDecline`.
 *
 * Run: npx tsx scripts/eval-answers.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateText, generateObject, tool, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { retrieveChunks } from '../lib/rag/retrieve'
import { EVAL_QUESTIONS } from '../lib/eval/questions'

for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
const model = google('gemini-flash-latest')

// Structured verdict the judge must return — validated by zod at the tool layer,
// so a malformed judgement auto-retries instead of silently corrupting the score.
const VerdictSchema = z.object({
  answersQuestion: z.boolean().describe('Does the answer actually address the question asked?'),
  grounded: z.boolean().describe('Is every factual claim supported by the retrieved context? false if any claim is not in the context.'),
  declined: z.boolean().describe('Did the answer appropriately say it lacks the information / decline, rather than inventing an answer?'),
  score: z.number().min(1).max(5).describe('Overall quality 1-5'),
  reasoning: z.string().describe('One or two sentences, in Thai, explaining the verdict.'),
})

/** Run the real agent, capturing the answer + the chunks its tool retrieved. */
async function runAgent(question: string) {
  const retrieved: { title: string; content: string }[] = []
  const result = await generateText({
    model,
    system:
      'คุณคือ "เกื้อ (ปกร)" Lead Developer ตอบในนามตัวเอง (ผม) เป็นภาษาไทย. ' +
      'ใช้ tool searchResume ดึงข้อมูลจริงก่อนตอบ. ' +
      'ให้ระบุเฉพาะเทคโนโลยี/เครื่องมือ/รายละเอียดที่ปรากฏจริงในผลลัพธ์จาก searchResume เท่านั้น ห้ามเติมเทคโนโลยีที่มักใช้คู่กันหรือเดาจากความรู้ทั่วไป. ' +
      'ถ้าข้อมูลที่ค้นได้ไม่มีเรื่องที่ถูกถาม ให้บอกตรงๆ ว่าไม่มีประสบการณ์ด้านนั้น ห้ามแต่งขึ้นมาเอง.',
    prompt: question,
    tools: {
      searchResume: tool({
        description: 'ค้นหาข้อมูลใน resume — ประสบการณ์ โปรเจกต์ ทักษะ',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const chunks = await retrieveChunks(query, 5)
          chunks.forEach((c) => retrieved.push({ title: c.title, content: c.content }))
          return chunks.map((c) => ({ title: c.title, content: c.content }))
        },
      }),
    },
    stopWhen: stepCountIs(5),
  })
  return { answer: result.text, retrieved }
}

/** The judge: sees ONLY question + retrieved context + answer. No world knowledge. */
async function judge(question: string, context: string, answer: string) {
  const { object } = await generateObject({
    model,
    schema: VerdictSchema,
    prompt: [
      'คุณคือกรรมการประเมินคำตอบของ RAG chatbot. ตัดสินโดยใช้ CONTEXT ที่ให้เท่านั้น ห้ามใช้ความรู้ภายนอก.',
      'ถ้าคำตอบมีข้อความที่ไม่ปรากฏใน CONTEXT ถือว่า grounded = false.',
      'ถ้า CONTEXT ไม่มีข้อมูลตรงคำถามเลย คำตอบที่ดีคือการปฏิเสธ (declined = true).',
      '',
      `QUESTION:\n${question}`,
      '',
      `RETRIEVED CONTEXT:\n${context || '(ไม่มี context ที่เกี่ยวข้อง)'}`,
      '',
      `ANSWER:\n${answer}`,
    ].join('\n'),
  })
  return object
}

async function main() {
  console.log(`\n═══ ANSWER / GROUNDEDNESS EVAL  (${EVAL_QUESTIONS.length} questions, LLM-as-judge) ═══\n`)
  let grounded = 0
  let scoreSum = 0
  let declineCorrect = 0
  let declineTotal = 0

  for (const q of EVAL_QUESTIONS) {
    const { answer, retrieved } = await runAgent(q.question)
    const context = retrieved.map((r) => `• ${r.title}: ${r.content}`).join('\n')
    const v = await judge(q.question, context, answer)

    if (v.grounded) grounded++
    scoreSum += v.score

    // Adversarial: the CORRECT behavior is to decline. Score that separately.
    let declineNote = ''
    if (q.shouldDecline) {
      declineTotal++
      const ok = v.declined
      if (ok) declineCorrect++
      declineNote = ok ? '  🛡️ ปฏิเสธถูกต้อง (ไม่มโน)' : '  ⚠️ ควรปฏิเสธแต่ไม่ปฏิเสธ (อาจมโน!)'
    }

    console.log(
      `[${q.category.padEnd(11)}] score ${v.score}/5  grounded=${v.grounded ? '✅' : '❌'}${declineNote}\n` +
        `   Q: ${q.question}\n` +
        `   ตัดสิน: ${v.reasoning}\n`,
    )
  }

  const n = EVAL_QUESTIONS.length
  console.log(`───────────────────────────────────────────`)
  console.log(`Grounded:     ${grounded}/${n}  = ${((grounded / n) * 100).toFixed(1)}%`)
  console.log(`คะแนนเฉลี่ย:   ${(scoreSum / n).toFixed(2)}/5`)
  if (declineTotal) console.log(`ดักมโน (adversarial): ปฏิเสธถูก ${declineCorrect}/${declineTotal}`)
  console.log(`───────────────────────────────────────────`)
}

main().catch((e) => {
  console.error('❌ eval-answers failed:', e)
  process.exit(1)
})
