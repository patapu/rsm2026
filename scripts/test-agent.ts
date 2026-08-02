/**
 * scripts/test-agent.ts — Phase 3 smoke test.
 *
 * Runs the EXACT agent flow that app/api/chat/route.ts now uses (generateText +
 * the searchResume RAG tool + gemini-2.5-flash), but from the CLI so we can see
 * it work without the route's fp_token/session auth gate.
 *
 * It proves the three things Phase 3 is about:
 *   1. the model DECIDES to call searchResume (agent behavior),
 *   2. retrieval returns real resume chunks (RAG),
 *   3. the model composes a grounded Thai answer from them.
 *
 * Run: npx tsx scripts/test-agent.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateText, tool, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { retrieveChunks } from '../lib/rag/retrieve'

// Load .env.local (standalone tsx doesn't auto-load Next env files).
for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const model = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})('gemini-flash-latest')

async function ask(question: string) {
  console.log(`\n──────────────────────────────────────────`)
  console.log(`❓ ผู้ใช้ถาม: "${question}"`)

  const result = await generateText({
    model,
    system:
      'คุณคือ "เกื้อ (ปกร)" Lead Developer ตอบในนามตัวเอง (ผม) เป็นภาษาไทย. ' +
      'ใช้ tool searchResume เพื่อดึงข้อมูลจริงจาก resume ก่อนตอบ ห้ามแต่งข้อมูลเอง.',
    prompt: question,
    tools: {
      searchResume: tool({
        description: 'ค้นหาข้อมูลใน resume ของปกร — ประสบการณ์ โปรเจกต์ ทักษะ',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const chunks = await retrieveChunks(query, 5)
          console.log(`   🔧 searchResume("${query}") → คืน ${chunks.length} chunks:`)
          chunks.forEach((c) => console.log(`      • ${c.title} (score ${c.score.toFixed(3)})`))
          return chunks.map((c) => ({ title: c.title, content: c.content }))
        },
      }),
    },
    stopWhen: stepCountIs(5),
  })

  console.log(`\n   📊 จำนวน step: ${result.steps.length}`)
  console.log(
    `   🛠️  tool ที่เรียก: ${
      result.steps.flatMap((s) => s.toolCalls).map((t) => t.toolName).join(', ') || '(ไม่เรียกเลย)'
    }`,
  )
  console.log(`\n   💬 คำตอบ:\n${result.text.split('\n').map((l) => '      ' + l).join('\n')}`)
}

async function main() {
  await ask('เล่าโปรเจกต์ CRM ที่เคยทำหน่อย')
  await ask('ถนัด Kubernetes กับ Docker แค่ไหน')
}

main().catch((e) => {
  console.error('❌ test-agent failed:', e)
  process.exit(1)
})
