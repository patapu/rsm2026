/**
 * components/chat/blocks/schema.ts — Zod schemas for the rich chat blocks
 * the AI can embed in its markdown reply, plus `parseBlock`, the single
 * entry point that turns a fenced code block's language + raw text into
 * validated data (or `null`).
 *
 * Transport: the API still returns `{ reply: string }`. The AI embeds these
 * blocks as JSON inside fenced code blocks with a `resume-description` /
 * `resume-table` / `resume-chart` info string — see
 * `components/chat/MarkdownContent.tsx`, which intercepts those fences.
 * `resume-bar` / `resume-level` / `resume-timeline` / `resume-radar` are
 * also accepted as aliases for `resume-chart` (see `CHART_KIND_ALIASES`
 * below) — defence-in-depth for a model that gets the fence name wrong.
 *
 * Parsing here is best-effort by design: a malformed AI payload (bad JSON,
 * a schema violation, mismatched row/axis lengths) must never throw during
 * render — `parseBlock` returns `null` on ANY failure so the caller can fall
 * back to rendering the original text as a plain code block.
 */

import { z } from 'zod'

// ──────────────────────────────────────────
//  Shared primitives
// ──────────────────────────────────────────

/**
 * YYYY-MM or the literal string "present" for an ongoing timeline item.
 * Mirrors `MonthYearOrPresent` in `lib/me/schema.ts`.
 */
const MonthYearOrPresent = z
  .string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2])|present)$/, {
    message: 'Expected YYYY-MM or "present"',
  })

// ──────────────────────────────────────────
//  String length bounds — the JSON payload is authored by an LLM and is
//  fully attacker-influenceable via prompt injection, so every string field
//  needs a `.max()` or a single multi-hundred-KB value blows up the DOM (the
//  chart SVGs already truncate what they render via `format.ts`; the
//  `DescriptionBlock`/`TableBlock` HTML renderers do not, so the schema is
//  the only backstop for those). Bounds are picked per rendering context:
//  chart row/axis labels are truncated to ~12-14 chars on-screen anyway so
//  they can be tight; prose fields (a description/timeline "detail") get
//  room for a sentence or two, not an essay.
// ──────────────────────────────────────────

/** Any block/chart `title` — a short heading, never body text. */
export const TITLE_MAX = 100
/** `resume-description` `term` — a short label, like a table header. */
export const TERM_MAX = 60
/** Prose fields: `resume-description` `detail`, timeline item `detail`. */
export const DETAIL_MAX = 300
/** `resume-table` column headers. */
export const COLUMN_MAX = 40
/** `resume-table` row cells — more generous than a header, still not prose. */
export const CELL_MAX = 200
/** Chart item/series labels (bar, level, radar series) — truncated to ~14 chars on-screen. */
export const LABEL_MAX = 40
/** Timeline item label (e.g. "Development Leader — MSC") — a bit longer than a bare category label. */
export const TIMELINE_LABEL_MAX = 60
/** Bar chart `unit` suffix (e.g. "yrs", "ครั้ง/สัปดาห์"). */
export const UNIT_MAX = 24
/** Radar axis name — truncated to ~12 chars on-screen, tightest of the labels. */
export const AXIS_MAX = 30

// ──────────────────────────────────────────
//  resume-description
// ──────────────────────────────────────────

export const DescriptionItemSchema = z.object({
  term: z.string().min(1).max(TERM_MAX),
  detail: z.string().min(1).max(DETAIL_MAX),
})

export const DescriptionBlockSchema = z.object({
  title: z.string().min(1).max(TITLE_MAX).optional(),
  items: z.array(DescriptionItemSchema).min(1).max(12),
})

export type DescriptionBlockData = z.infer<typeof DescriptionBlockSchema>

// ──────────────────────────────────────────
//  resume-table
// ──────────────────────────────────────────

export const TableBlockSchema = z
  .object({
    title: z.string().min(1).max(TITLE_MAX).optional(),
    columns: z.array(z.string().min(1).max(COLUMN_MAX)).min(1).max(6),
    rows: z.array(z.array(z.string().max(CELL_MAX))).min(1).max(20),
  })
  .refine((data) => data.rows.every((row) => row.length === data.columns.length), {
    message: 'Every row must have the same number of cells as columns',
    path: ['rows'],
  })

export type TableBlockData = z.infer<typeof TableBlockSchema>

// ──────────────────────────────────────────
//  resume-chart — discriminated on `kind`
// ──────────────────────────────────────────

const BarSeriesItemSchema = z.object({
  label: z.string().min(1).max(LABEL_MAX),
  // None of this resume data is ever meaningfully negative — reject rather
  // than let a nonsense negative value render visually identical to 0 (see
  // the `Math.max(0, ...)` clamp in BarChart.tsx).
  value: z.number().finite().min(0),
})

export const BarChartSchema = z.object({
  kind: z.literal('bar'),
  title: z.string().min(1).max(TITLE_MAX).optional(),
  unit: z.string().min(1).max(UNIT_MAX).optional(),
  series: z.array(BarSeriesItemSchema).min(1).max(12),
})

export type BarChartData = z.infer<typeof BarChartSchema>

const LevelItemSchema = z.object({
  label: z.string().min(1).max(LABEL_MAX),
  value: z.number().min(0).max(100),
})

export const LevelChartSchema = z.object({
  kind: z.literal('level'),
  title: z.string().min(1).max(TITLE_MAX).optional(),
  items: z.array(LevelItemSchema).min(1).max(12),
})

export type LevelChartData = z.infer<typeof LevelChartSchema>

/** "YYYY-MM" (or the literal "present", treated as +Infinity) to a comparable month index. */
function monthValue(value: string): number {
  if (value === 'present') return Infinity
  const [year, month] = value.split('-').map(Number)
  return year * 12 + month
}

const TimelineItemSchema = z
  .object({
    label: z.string().min(1).max(TIMELINE_LABEL_MAX),
    start: MonthYearOrPresent,
    end: MonthYearOrPresent,
    detail: z.string().min(1).max(DETAIL_MAX).optional(),
  })
  .refine((item) => monthValue(item.end) >= monthValue(item.start), {
    message: 'end must be on or after start',
    path: ['end'],
  })

export const TimelineChartSchema = z.object({
  kind: z.literal('timeline'),
  title: z.string().min(1).max(TITLE_MAX).optional(),
  items: z.array(TimelineItemSchema).min(1).max(10),
})

export type TimelineChartData = z.infer<typeof TimelineChartSchema>

const RadarSeriesSchema = z.object({
  label: z.string().min(1).max(LABEL_MAX),
  values: z.array(z.number().min(0).max(100)),
})

export const RadarChartSchema = z
  .object({
    kind: z.literal('radar'),
    title: z.string().min(1).max(TITLE_MAX).optional(),
    axes: z.array(z.string().min(1).max(AXIS_MAX)).min(3).max(8),
    // Hard-capped at 2 — of the four validated palette slots, only slot1
    // (cyan) + slot2 (magenta) clear the all-pairs CVD adjacency check a
    // radar's overlapping fills require. See palette.ts.
    series: z.array(RadarSeriesSchema).min(1).max(2),
  })
  .refine((data) => data.series.every((s) => s.values.length === data.axes.length), {
    message: 'Every series must supply exactly one value per axis',
    path: ['series'],
  })

export type RadarChartData = z.infer<typeof RadarChartSchema>

export const ChartBlockSchema = z.discriminatedUnion('kind', [
  BarChartSchema,
  LevelChartSchema,
  TimelineChartSchema,
  RadarChartSchema,
])

export type ChartBlockData = z.infer<typeof ChartBlockSchema>

// ──────────────────────────────────────────
//  Alias fences — defence-in-depth for an LLM that invents a fence name
//  from a chart's `kind` instead of emitting the real `resume-chart` fence
//  (observed in production: ` ```resume-level ` with no `kind` field at all,
//  otherwise a perfectly valid level chart). Maps each alias fence language
//  to the `kind` it implies. See `parseBlock` below for how this is used —
//  the alias is only ever a FALLBACK HINT: if the payload supplies its own
//  `kind`, the payload wins.
// ──────────────────────────────────────────

const CHART_KIND_ALIASES: Record<string, ChartBlockData['kind']> = {
  'resume-bar': 'bar',
  'resume-level': 'level',
  'resume-timeline': 'timeline',
  'resume-radar': 'radar',
}

/**
 * Injects `kind: aliasKind` into `json` when `json` is a plain object that
 * omits `kind` entirely. Leaves `json` untouched in every other case —
 * non-objects fall through unchanged (and fail schema validation as before),
 * and an object that already specifies `kind` is never overwritten: the
 * payload's explicit `kind` is the more specific, deliberate signal and the
 * fence name is only a fallback hint when it's missing.
 */
function withInferredChartKind(
  json: unknown,
  aliasKind: ChartBlockData['kind'] | undefined,
): unknown {
  if (!aliasKind) return json
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return json
  if ('kind' in json) return json
  return { ...json, kind: aliasKind }
}

// ──────────────────────────────────────────
//  parseBlock — safe JSON.parse + Zod safeParse, never throws
// ──────────────────────────────────────────

export type ParsedBlock =
  | { kind: 'description'; data: DescriptionBlockData }
  | { kind: 'table'; data: TableBlockData }
  | { kind: 'chart'; data: ChartBlockData }

/**
 * Attempts to parse `raw` (the text content of a fenced code block) as one
 * of the rich chat block shapes for the given `lang` (the fence's info
 * string, e.g. `resume-table`). Returns `null` on ANY failure — invalid
 * JSON, a schema violation, or an unrecognised `lang` — so callers can fall
 * back to rendering the original text as a plain code block instead of
 * crashing.
 */
export function parseBlock(lang: string, raw: string): ParsedBlock | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }

  if (lang === 'resume-description') {
    const result = DescriptionBlockSchema.safeParse(json)
    return result.success ? { kind: 'description', data: result.data } : null
  }
  if (lang === 'resume-table') {
    const result = TableBlockSchema.safeParse(json)
    return result.success ? { kind: 'table', data: result.data } : null
  }
  if (lang === 'resume-chart' || lang in CHART_KIND_ALIASES) {
    const payload = withInferredChartKind(json, CHART_KIND_ALIASES[lang])
    const result = ChartBlockSchema.safeParse(payload)
    return result.success ? { kind: 'chart', data: result.data } : null
  }
  return null
}
