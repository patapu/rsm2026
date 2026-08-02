/**
 * scripts/eval-retrieval.ts — Phase 4a: RETRIEVAL eval.
 *
 * Measures ONLY the retriever (retrieveChunks) — no LLM involved. For each
 * question we know which chunk(s) *should* come back, so we can score:
 *
 *   Hit@k  — did ANY expected chunk appear in the top-k? (1 or 0 per question)
 *            Answers "can the model even see the right info?"
 *   MRR    — Mean Reciprocal Rank = average of 1/(rank of first correct hit).
 *            Rank 1 → 1.0, rank 2 → 0.5, rank 3 → 0.33, not found → 0.
 *            Rewards putting the right chunk HIGH, not just present. Two
 *            retrievers can both hit@5=100% but very different MRR — the higher
 *            one wastes less of the model's attention on wrong chunks.
 *
 * Adversarial questions have no expected chunk (retrieval always returns
 * something), so they're excluded from these metrics — they're scored in the
 * ANSWER eval instead (hallucination resistance).
 *
 * Run: npx tsx scripts/eval-retrieval.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { retrieveChunks } from '../lib/rag/retrieve'
import { EVAL_QUESTIONS } from '../lib/eval/questions'

// Load .env.local (tsx doesn't auto-load Next env files).
for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const K = 5

async function main() {
  // Only questions with a known-correct chunk are scorable for retrieval.
  const scorable = EVAL_QUESTIONS.filter((q) => q.expectedChunkIds.length > 0)

  let hits = 0
  let reciprocalRankSum = 0
  const rows: string[] = []

  for (const q of scorable) {
    const results = await retrieveChunks(q.question, K)
    const ids = results.map((r) => r.id)

    // rank (1-based) of the FIRST retrieved chunk that's in the expected set.
    let rank = 0
    for (let i = 0; i < ids.length; i++) {
      if (q.expectedChunkIds.includes(ids[i])) {
        rank = i + 1
        break
      }
    }

    const hit = rank > 0
    if (hit) hits++
    reciprocalRankSum += rank > 0 ? 1 / rank : 0

    const topId = ids[0]
    rows.push(
      `${hit ? '✅' : '❌'} [${q.category.padEnd(9)}] rank=${rank || '-'}  ` +
        `"${q.question}"\n     └ top-1: ${topId}${
          hit && rank > 1 ? `   (correct was at rank ${rank})` : ''
        }`,
    )
  }

  const n = scorable.length
  console.log(`\n═══ RETRIEVAL EVAL  (top-k = ${K}, ${n} scorable questions) ═══\n`)
  console.log(rows.join('\n'))
  console.log(`\n───────────────────────────────────────────`)
  console.log(`Hit@${K}:  ${hits}/${n}  = ${((hits / n) * 100).toFixed(1)}%`)
  console.log(`MRR:     ${(reciprocalRankSum / n).toFixed(3)}   (1.0 = every correct chunk ranked #1)`)
  console.log(`───────────────────────────────────────────`)
  console.log(
    `\nอ่านผล: Hit@${K} สูง = ค้นเจอ. MRR ต่ำกว่า Hit แปลว่าเจอแต่ไม่ค่อยได้อันดับ 1 — ` +
      `ปกติสำหรับ corpus เนื้อเดียว (chunk คล้ายกันหมด). ดู rank>1 ว่าตัวไหนโดนแย่งที่.`,
  )
}

main().catch((e) => {
  console.error('❌ eval-retrieval failed:', e)
  process.exit(1)
})
