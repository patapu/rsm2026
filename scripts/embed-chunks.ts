/**
 * scripts/embed-chunks.ts — Phase 2 of the resume-chatbot RAG upgrade.
 *
 * WHAT THIS DOES:
 *   1. Reads the 22 chunks from Phase 1 (lib/me/chunks.json).
 *   2. Turns each chunk's `text` into a 768-dim VECTOR via Gemini embeddings.
 *   3. Stores (id, type, title, content, embedding) in the pgvector table.
 *   4. Proves it worked: embeds a test QUESTION and finds the nearest chunks —
 *      this is the actual "retrieval" of Retrieval-Augmented Generation.
 *
 * Two teaching points baked in below:
 *   • outputDimensionality: gemini-embedding-001 defaults to 3072 dims, but our
 *     table is vector(768). We shrink the output to 768 so it fits — dimension
 *     of the model MUST equal dimension of the column, always.
 *   • taskType (asymmetric embedding): documents are embedded as
 *     RETRIEVAL_DOCUMENT, the user's question as RETRIEVAL_QUERY. Same model,
 *     different "mode" — this measurably improves match quality vs embedding
 *     both sides identically. Most tutorials skip this; real RAG uses it.
 *
 * This script never touches the live route (that's Phase 3). Run it with:
 *   npx tsx scripts/embed-chunks.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { embedMany, embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Pool } from 'pg'

// ── Load .env.local ─────────────────────────────────────────────
// A standalone tsx script does NOT auto-load Next.js env files, so we parse
// .env.local ourselves and put the values into process.env. Tiny + dependency-
// free (dotenv not installed). Only sets keys that aren't already present.
for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const PG_URL = process.env.RAG_PG_URL
if (!API_KEY) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local')
if (!PG_URL) throw new Error('Missing RAG_PG_URL in .env.local')

// Explicit provider (reads the key we just loaded) rather than the ambient
// default, so key-load order is never a mystery.
const google = createGoogleGenerativeAI({ apiKey: API_KEY })
const model = google.embedding('gemini-embedding-001')
const DIMS = 768

interface Chunk { id: string; type: string; title: string; text: string }

// pgvector wants its input as the literal string "[0.1,0.2,...]".
const toVectorLiteral = (v: number[]) => `[${v.join(',')}]`

async function main() {
  const chunks: Chunk[] = JSON.parse(
    readFileSync(join(process.cwd(), 'lib', 'me', 'chunks.json'), 'utf8'),
  )
  console.log(`Read ${chunks.length} chunks. Embedding via gemini-embedding-001 @ ${DIMS} dims...`)

  // ── Step A: embed every chunk (as DOCUMENTS) ──────────────────
  const { embeddings } = await embedMany({
    model,
    values: chunks.map((c) => c.text),
    providerOptions: {
      google: { outputDimensionality: DIMS, taskType: 'RETRIEVAL_DOCUMENT' },
    },
  })
  console.log(`✅ Got ${embeddings.length} embeddings, each ${embeddings[0].length} dims`)

  // ── Step B: store in pgvector (upsert so re-runs are safe) ─────
  const pool = new Pool({ connectionString: PG_URL })
  try {
    let stored = 0
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      await pool.query(
        `INSERT INTO resume_chunks (id, type, title, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         ON CONFLICT (id) DO UPDATE
           SET type = EXCLUDED.type, title = EXCLUDED.title,
               content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
        [c.id, c.type, c.title, c.text, toVectorLiteral(embeddings[i])],
      )
      stored++
    }
    console.log(`✅ Stored ${stored} rows in resume_chunks\n`)

    // ── Step C: PROVE retrieval works ───────────────────────────
    // Embed a real question as a QUERY, then ask pgvector for the 3 nearest
    // chunks. `<=>` is cosine distance (smaller = more similar). If the right
    // chunks come back for a question whose words don't literally appear in
    // them, semantic retrieval is working.
    const question = 'มีประสบการณ์ทำระบบ CRM และ Kubernetes ไหม'
    const { embedding: qVec } = await embed({
      model,
      value: question,
      providerOptions: { google: { outputDimensionality: DIMS, taskType: 'RETRIEVAL_QUERY' } },
    })
    const { rows } = await pool.query<{ title: string; type: string; dist: number }>(
      `SELECT title, type, embedding <=> $1::vector AS dist
         FROM resume_chunks
         ORDER BY dist ASC
         LIMIT 3`,
      [toVectorLiteral(qVec)],
    )
    console.log(`🔎 คำถามทดสอบ: "${question}"\n   chunk ที่ใกล้ที่สุด 3 อันดับ:`)
    rows.forEach((r, i) =>
      console.log(`   ${i + 1}. [${r.type}] ${r.title}  (cosine dist ${r.dist.toFixed(4)})`),
    )
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error('❌ embed-chunks failed:', e)
  process.exit(1)
})
