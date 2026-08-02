/**
 * lib/rag/retrieve.ts — the "R" (Retrieval) of RAG, shared by the API route
 * and any script that needs it.
 *
 * Given a natural-language question, this:
 *   1. Embeds the question as a QUERY (taskType RETRIEVAL_QUERY) — the mirror of
 *      how chunks were embedded as RETRIEVAL_DOCUMENT in scripts/embed-chunks.ts.
 *   2. Cosine-searches the pgvector `resume_chunks` table for the nearest chunks.
 *   3. Returns the top-k, most-relevant slices — NOT the whole resume.
 *
 * That last point is the entire reason RAG exists here: instead of the route
 * shipping the full `ME` object to the model every turn, the model pulls back
 * only the handful of chunks that actually answer the question.
 */

import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Pool } from 'pg'

const EMBED_MODEL = 'gemini-embedding-001'
const DIMS = 768 // must equal the resume_chunks.embedding vector(768) column

// ── Lazy singletons ─────────────────────────────────────────────
// One Pool + one provider per server process, created on first use. Creating a
// fresh Pool per request would exhaust Postgres connections under load.
let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.RAG_PG_URL
    if (!connectionString) throw new Error('Missing RAG_PG_URL')
    pool = new Pool({ connectionString, max: 4 })
  }
  return pool
}

let embedModel: ReturnType<ReturnType<typeof createGoogleGenerativeAI>['embedding']> | null = null
function getEmbedModel() {
  if (!embedModel) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY')
    embedModel = createGoogleGenerativeAI({ apiKey }).embedding(EMBED_MODEL)
  }
  return embedModel
}

export interface RetrievedChunk {
  id: string
  type: string
  title: string
  content: string
  /** cosine similarity in [0,1] — higher = more relevant (1 - cosine distance). */
  score: number
}

/**
 * Embed `question` as a retrieval query and return the `topK` most similar
 * resume chunks, most-relevant first.
 */
export async function retrieveChunks(question: string, topK = 5): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: getEmbedModel(),
    value: question,
    providerOptions: {
      google: { outputDimensionality: DIMS, taskType: 'RETRIEVAL_QUERY' },
    },
  })

  const vectorLiteral = `[${embedding.join(',')}]`
  // `<=>` is cosine DISTANCE (0 = identical). We ORDER BY it ascending to get
  // the closest chunks, and expose `1 - distance` as an intuitive similarity.
  const { rows } = await getPool().query<RetrievedChunk>(
    `SELECT id, type, title, content,
            1 - (embedding <=> $1::vector) AS score
       FROM resume_chunks
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $2`,
    [vectorLiteral, topK],
  )
  return rows
}
