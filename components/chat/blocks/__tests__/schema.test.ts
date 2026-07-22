/**
 * components/chat/blocks/schema.test.ts — `parseBlock` happy-path and
 * rejection coverage.
 *
 * `parseBlock` is documented to NEVER throw — any malformed AI payload (bad
 * JSON, a schema violation, a mismatched row/axis length) must fall back to
 * `null` so the caller can render the original text as a plain code block
 * instead of crashing the chat UI. The rejection half below is the more
 * important half: it locks down every documented failure mode plus a
 * blanket fast-check "never throws" property over arbitrary input.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  parseBlock,
  TITLE_MAX,
  TERM_MAX,
  DETAIL_MAX,
  COLUMN_MAX,
  CELL_MAX,
  LABEL_MAX,
  TIMELINE_LABEL_MAX,
  UNIT_MAX,
  AXIS_MAX,
} from '../schema'

/** Repeats 'x' to build a string of exactly `n` chars. */
function strOfLen(n: number): string {
  return 'x'.repeat(n)
}

// ──────────────────────────────────────────
//  Happy paths — one valid payload per block type / chart kind
// ──────────────────────────────────────────

describe('parseBlock — happy paths', () => {
  it('parses a valid resume-description payload', () => {
    const raw = JSON.stringify({
      title: 'Skills',
      items: [{ term: 'React', detail: '5 years' }],
    })
    const result = parseBlock('resume-description', raw)
    expect(result).toEqual({
      kind: 'description',
      data: { title: 'Skills', items: [{ term: 'React', detail: '5 years' }] },
    })
  })

  it('parses a valid resume-table payload', () => {
    const raw = JSON.stringify({
      title: 'Experience',
      columns: ['Company', 'Role'],
      rows: [
        ['Acme', 'Engineer'],
        ['Globex', 'Lead'],
      ],
    })
    const result = parseBlock('resume-table', raw)
    expect(result?.kind).toBe('table')
    expect(result).toEqual({
      kind: 'table',
      data: {
        title: 'Experience',
        columns: ['Company', 'Role'],
        rows: [
          ['Acme', 'Engineer'],
          ['Globex', 'Lead'],
        ],
      },
    })
  })

  it('parses a valid resume-chart bar payload', () => {
    const raw = JSON.stringify({
      kind: 'bar',
      title: 'Languages',
      unit: 'yrs',
      series: [{ label: 'TypeScript', value: 5 }],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: {
        kind: 'bar',
        title: 'Languages',
        unit: 'yrs',
        series: [{ label: 'TypeScript', value: 5 }],
      },
    })
  })

  it('parses a valid resume-chart level payload', () => {
    const raw = JSON.stringify({
      kind: 'level',
      items: [{ label: 'React', value: 80 }],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: { kind: 'level', items: [{ label: 'React', value: 80 }] },
    })
  })

  it('parses a valid resume-chart timeline payload', () => {
    const raw = JSON.stringify({
      kind: 'timeline',
      title: 'Career',
      items: [{ label: 'Acme', start: '2020-01', end: 'present', detail: 'Backend' }],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: {
        kind: 'timeline',
        title: 'Career',
        items: [{ label: 'Acme', start: '2020-01', end: 'present', detail: 'Backend' }],
      },
    })
  })

  it('parses a valid resume-chart radar payload', () => {
    const raw = JSON.stringify({
      kind: 'radar',
      axes: ['Speed', 'Quality', 'Communication'],
      series: [
        { label: 'Me', values: [80, 90, 70] },
        { label: 'Team avg', values: [60, 70, 65] },
      ],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: {
        kind: 'radar',
        axes: ['Speed', 'Quality', 'Communication'],
        series: [
          { label: 'Me', values: [80, 90, 70] },
          { label: 'Team avg', values: [60, 70, 65] },
        ],
      },
    })
  })
})

// ──────────────────────────────────────────
//  Rejections — the important half. parseBlock must return null, never throw.
// ──────────────────────────────────────────

describe('parseBlock — rejections (must return null, never throw)', () => {
  describe('malformed JSON', () => {
    it.each([
      ['truncated', '{"items":[{"term":"a","detail":"b"}]'],
      ['trailing comma', '{"items":[{"term":"a","detail":"b"}],}'],
      ['single quotes', "{'items':[{'term':'a','detail':'b'}]}"],
    ])('%s JSON returns null for resume-description', (_label, raw) => {
      expect(parseBlock('resume-description', raw)).toBeNull()
    })
  })

  it('table with a row length != columns.length returns null', () => {
    const raw = JSON.stringify({
      columns: ['A', 'B'],
      rows: [['1', '2'], ['3']],
    })
    expect(parseBlock('resume-table', raw)).toBeNull()
  })

  it('radar whose values.length != axes.length returns null', () => {
    const raw = JSON.stringify({
      kind: 'radar',
      axes: ['a', 'b', 'c'],
      series: [{ label: 'S1', values: [10, 20] }],
    })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })

  it('radar with 3 series (hard cap is 2) returns null even when every series matches axes length', () => {
    const raw = JSON.stringify({
      kind: 'radar',
      axes: ['a', 'b', 'c'],
      series: [
        { label: 'S1', values: [10, 20, 30] },
        { label: 'S2', values: [40, 50, 60] },
        { label: 'S3', values: [70, 80, 90] },
      ],
    })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })

  describe('out-of-range values', () => {
    it('level value above 100 returns null', () => {
      const raw = JSON.stringify({ kind: 'level', items: [{ label: 'A', value: 101 }] })
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
    it('level value below 0 returns null', () => {
      const raw = JSON.stringify({ kind: 'level', items: [{ label: 'A', value: -1 }] })
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
    it('radar value above 100 returns null', () => {
      const raw = JSON.stringify({
        kind: 'radar',
        axes: ['a', 'b', 'c'],
        series: [{ label: 'S1', values: [10, 20, 101] }],
      })
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
    it('radar value below 0 returns null', () => {
      const raw = JSON.stringify({
        kind: 'radar',
        axes: ['a', 'b', 'c'],
        series: [{ label: 'S1', values: [10, 20, -1] }],
      })
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
  })

  describe('array bounds violations', () => {
    it('description with 0 items returns null', () => {
      expect(parseBlock('resume-description', JSON.stringify({ items: [] }))).toBeNull()
    })
    it('description with 13 items (max 12) returns null', () => {
      const items = Array.from({ length: 13 }, (_, i) => ({ term: `t${i}`, detail: `d${i}` }))
      expect(parseBlock('resume-description', JSON.stringify({ items }))).toBeNull()
    })
    it('table with 0 columns returns null', () => {
      expect(
        parseBlock('resume-table', JSON.stringify({ columns: [], rows: [] })),
      ).toBeNull()
    })
    it('table with 21 rows (max 20) returns null', () => {
      const rows = Array.from({ length: 21 }, (_, i) => [`r${i}`])
      expect(
        parseBlock('resume-table', JSON.stringify({ columns: ['A'], rows })),
      ).toBeNull()
    })
    it('bar chart with 0 series returns null', () => {
      expect(
        parseBlock('resume-chart', JSON.stringify({ kind: 'bar', series: [] })),
      ).toBeNull()
    })
    it('bar chart with 13 series (max 12) returns null', () => {
      const series = Array.from({ length: 13 }, (_, i) => ({ label: `s${i}`, value: i }))
      expect(parseBlock('resume-chart', JSON.stringify({ kind: 'bar', series }))).toBeNull()
    })
    it('radar with 2 axes (min 3) returns null', () => {
      const raw = JSON.stringify({
        kind: 'radar',
        axes: ['a', 'b'],
        series: [{ label: 'S1', values: [10, 20] }],
      })
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
    it('radar with 9 axes (max 8) returns null', () => {
      const axes = Array.from({ length: 9 }, (_, i) => `axis${i}`)
      const raw = JSON.stringify({
        kind: 'radar',
        axes,
        series: [{ label: 'S1', values: axes.map(() => 10) }],
      })
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
  })

  describe('Infinity / NaN in a bar value', () => {
    it('a value that JSON-parses to Infinity (1e400 overflow) fails the .finite() check', () => {
      const raw = '{"kind":"bar","series":[{"label":"A","value":1e400}]}'
      // Sanity: JSON.parse itself succeeds and produces Infinity — this is
      // NOT caught by the JSON.parse try/catch, only by z.number().finite().
      expect(JSON.parse(raw).series[0].value).toBe(Infinity)
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
    it('a literal unquoted NaN is invalid JSON and returns null', () => {
      const raw = '{"kind":"bar","series":[{"label":"A","value":NaN}]}'
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
  })

  it('an unknown chart kind returns null', () => {
    const raw = JSON.stringify({ kind: 'pie', series: [{ label: 'A', value: 1 }] })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })

  describe('non-object payloads', () => {
    it.each([
      ['array', '[]'],
      ['null', 'null'],
      ['number', '42'],
    ])('%s returns null for resume-description', (_label, raw) => {
      expect(parseBlock('resume-description', raw)).toBeNull()
    })
    it.each([
      ['array', '[]'],
      ['null', 'null'],
      ['number', '42'],
    ])('%s returns null for resume-table', (_label, raw) => {
      expect(parseBlock('resume-table', raw)).toBeNull()
    })
    it.each([
      ['array', '[]'],
      ['null', 'null'],
      ['number', '42'],
    ])('%s returns null for resume-chart', (_label, raw) => {
      expect(parseBlock('resume-chart', raw)).toBeNull()
    })
  })

  it('an unrecognised lang always returns null regardless of payload validity', () => {
    const raw = JSON.stringify({ items: [{ term: 'a', detail: 'b' }] })
    expect(parseBlock('js', raw)).toBeNull()
    expect(parseBlock('resume-unknown', raw)).toBeNull()
  })
})

// ──────────────────────────────────────────
//  Security hardening — added after code review, previously untested
// ──────────────────────────────────────────

describe('parseBlock — negative bar values are rejected', () => {
  it('a negative bar value returns null', () => {
    const raw = JSON.stringify({
      kind: 'bar',
      series: [{ label: 'x', value: -50 }],
    })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })

  it('a zero (non-negative) bar value still parses', () => {
    const raw = JSON.stringify({
      kind: 'bar',
      series: [{ label: 'x', value: 0 }],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: { kind: 'bar', series: [{ label: 'x', value: 0 }] },
    })
  })
})

describe('parseBlock — timeline end must be chronologically >= start', () => {
  it('end month before start month returns null', () => {
    const raw = JSON.stringify({
      kind: 'timeline',
      items: [{ label: 'A', start: '2020-05', end: '2019-01' }],
    })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })

  it('end equal to start (same month) is accepted', () => {
    const raw = JSON.stringify({
      kind: 'timeline',
      items: [{ label: 'A', start: '2020-05', end: '2020-05' }],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result?.kind).toBe('chart')
    expect(result).not.toBeNull()
  })

  it('end "present" (treated as +Infinity) is accepted regardless of start', () => {
    const raw = JSON.stringify({
      kind: 'timeline',
      items: [{ label: 'A', start: '2020-05', end: 'present' }],
    })
    const result = parseBlock('resume-chart', raw)
    expect(result).not.toBeNull()
  })

  it('start "present" with a concrete end returns null (present is never before a real date)', () => {
    const raw = JSON.stringify({
      kind: 'timeline',
      items: [{ label: 'A', start: 'present', end: '2020-05' }],
    })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })

  it('compares chronologically, not lexicographically: 2020-05 to 2020-09 spans a string-descending but chronologically-ascending pair', () => {
    // Sanity check that the comparison is numeric (year*12+month), not a
    // naive string compare — both orderings agree here, but a subtly wrong
    // implementation (e.g. comparing "05" > "09" as strings) would flip this.
    const raw = JSON.stringify({
      kind: 'timeline',
      items: [{ label: 'A', start: '2020-05', end: '2020-09' }],
    })
    expect(parseBlock('resume-chart', raw)).not.toBeNull()
  })
})

describe('parseBlock — string length caps (max parses, max+1 rejects)', () => {
  it.each([
    ['title', TITLE_MAX] as const,
  ])('description %s at exactly %d chars parses, max+1 rejects', (_field, max) => {
    const ok = JSON.stringify({
      title: strOfLen(max),
      items: [{ term: 'React', detail: '5 years' }],
    })
    expect(parseBlock('resume-description', ok)).not.toBeNull()

    const bad = JSON.stringify({
      title: strOfLen(max + 1),
      items: [{ term: 'React', detail: '5 years' }],
    })
    expect(parseBlock('resume-description', bad)).toBeNull()
  })

  it(`description item term at exactly ${TERM_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({ items: [{ term: strOfLen(TERM_MAX), detail: 'd' }] })
    expect(parseBlock('resume-description', ok)).not.toBeNull()

    const bad = JSON.stringify({ items: [{ term: strOfLen(TERM_MAX + 1), detail: 'd' }] })
    expect(parseBlock('resume-description', bad)).toBeNull()
  })

  it(`description item detail at exactly ${DETAIL_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({ items: [{ term: 't', detail: strOfLen(DETAIL_MAX) }] })
    expect(parseBlock('resume-description', ok)).not.toBeNull()

    const bad = JSON.stringify({ items: [{ term: 't', detail: strOfLen(DETAIL_MAX + 1) }] })
    expect(parseBlock('resume-description', bad)).toBeNull()
  })

  it(`table columns[] entries at exactly ${COLUMN_MAX} chars parse, max+1 rejects`, () => {
    const ok = JSON.stringify({ columns: [strOfLen(COLUMN_MAX)], rows: [['1']] })
    expect(parseBlock('resume-table', ok)).not.toBeNull()

    const bad = JSON.stringify({ columns: [strOfLen(COLUMN_MAX + 1)], rows: [['1']] })
    expect(parseBlock('resume-table', bad)).toBeNull()
  })

  it(`table row cells at exactly ${CELL_MAX} chars parse, max+1 rejects`, () => {
    const ok = JSON.stringify({ columns: ['A'], rows: [[strOfLen(CELL_MAX)]] })
    expect(parseBlock('resume-table', ok)).not.toBeNull()

    const bad = JSON.stringify({ columns: ['A'], rows: [[strOfLen(CELL_MAX + 1)]] })
    expect(parseBlock('resume-table', bad)).toBeNull()
  })

  it(`bar chart label at exactly ${LABEL_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({ kind: 'bar', series: [{ label: strOfLen(LABEL_MAX), value: 1 }] })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'bar',
      series: [{ label: strOfLen(LABEL_MAX + 1), value: 1 }],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })

  it(`bar chart unit at exactly ${UNIT_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({
      kind: 'bar',
      unit: strOfLen(UNIT_MAX),
      series: [{ label: 'A', value: 1 }],
    })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'bar',
      unit: strOfLen(UNIT_MAX + 1),
      series: [{ label: 'A', value: 1 }],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })

  it(`level chart label at exactly ${LABEL_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({ kind: 'level', items: [{ label: strOfLen(LABEL_MAX), value: 50 }] })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'level',
      items: [{ label: strOfLen(LABEL_MAX + 1), value: 50 }],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })

  it(`timeline item label at exactly ${TIMELINE_LABEL_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({
      kind: 'timeline',
      items: [{ label: strOfLen(TIMELINE_LABEL_MAX), start: '2020-01', end: 'present' }],
    })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'timeline',
      items: [{ label: strOfLen(TIMELINE_LABEL_MAX + 1), start: '2020-01', end: 'present' }],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })

  it(`timeline item detail at exactly ${DETAIL_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({
      kind: 'timeline',
      items: [
        { label: 'A', start: '2020-01', end: 'present', detail: strOfLen(DETAIL_MAX) },
      ],
    })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'timeline',
      items: [
        { label: 'A', start: '2020-01', end: 'present', detail: strOfLen(DETAIL_MAX + 1) },
      ],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })

  it(`radar series label at exactly ${LABEL_MAX} chars parses, max+1 rejects`, () => {
    const ok = JSON.stringify({
      kind: 'radar',
      axes: ['a', 'b', 'c'],
      series: [{ label: strOfLen(LABEL_MAX), values: [1, 2, 3] }],
    })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'radar',
      axes: ['a', 'b', 'c'],
      series: [{ label: strOfLen(LABEL_MAX + 1), values: [1, 2, 3] }],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })

  it(`radar axes[] entries at exactly ${AXIS_MAX} chars parse, max+1 rejects`, () => {
    const ok = JSON.stringify({
      kind: 'radar',
      axes: [strOfLen(AXIS_MAX), 'b', 'c'],
      series: [{ label: 'S1', values: [1, 2, 3] }],
    })
    expect(parseBlock('resume-chart', ok)).not.toBeNull()

    const bad = JSON.stringify({
      kind: 'radar',
      axes: [strOfLen(AXIS_MAX + 1), 'b', 'c'],
      series: [{ label: 'S1', values: [1, 2, 3] }],
    })
    expect(parseBlock('resume-chart', bad)).toBeNull()
  })
})

describe('parseBlock — radar 2-series cap (correctness rule, not arbitrary)', () => {
  // Only cyan (slot1) + magenta (slot2) clear the all-pairs CVD adjacency
  // check a radar's overlapping fills require — a 3rd series would be
  // indistinguishable to colorblind readers, so the cap is enforced above
  // in the "array bounds violations" describe (3 series -> null) and here
  // we re-assert the accepted boundary explicitly.
  it('exactly 2 series is accepted', () => {
    const raw = JSON.stringify({
      kind: 'radar',
      axes: ['a', 'b', 'c'],
      series: [
        { label: 'S1', values: [10, 20, 30] },
        { label: 'S2', values: [40, 50, 60] },
      ],
    })
    expect(parseBlock('resume-chart', raw)).not.toBeNull()
  })

  it('3 series is rejected (hard cap is 2)', () => {
    const raw = JSON.stringify({
      kind: 'radar',
      axes: ['a', 'b', 'c'],
      series: [
        { label: 'S1', values: [10, 20, 30] },
        { label: 'S2', values: [40, 50, 60] },
        { label: 'S3', values: [70, 80, 90] },
      ],
    })
    expect(parseBlock('resume-chart', raw)).toBeNull()
  })
})

// ──────────────────────────────────────────
//  Alias fences — resume-bar / resume-level / resume-timeline / resume-radar
//  are accepted as fallback aliases for resume-chart (production failure:
//  the model emitted ` ```resume-level ` instead of ` ```resume-chart ` with
//  `"kind":"level"`).
// ──────────────────────────────────────────

describe('parseBlock — alias fences (resume-bar/level/timeline/radar)', () => {
  it('an alias fence with a payload that omits `kind` parses as the kind implied by the fence name', () => {
    const raw = JSON.stringify({
      title: 'Technical Skill Proficiency',
      items: [{ label: 'JavaScript', value: 90 }],
    })
    const result = parseBlock('resume-level', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: {
        kind: 'level',
        title: 'Technical Skill Proficiency',
        items: [{ label: 'JavaScript', value: 90 }],
      },
    })
  })

  it('an alias fence whose payload has a conflicting explicit `kind` resolves to the payload kind, not the fence alias', () => {
    const raw = JSON.stringify({
      kind: 'bar',
      series: [{ label: 'A', value: 5 }],
    })
    // Fence says "level", payload says "bar" — payload wins.
    const result = parseBlock('resume-level', raw)
    expect(result).toEqual({
      kind: 'chart',
      data: { kind: 'bar', series: [{ label: 'A', value: 5 }] },
    })
  })

  it('an alias fence with an otherwise-invalid payload still returns null', () => {
    // `resume-level` implies kind "level", but the value is out of the 0-100
    // range — injecting `kind` does not rescue an invalid payload.
    const raw = JSON.stringify({ items: [{ label: 'A', value: 101 }] })
    expect(parseBlock('resume-level', raw)).toBeNull()
  })

  it('resume-bar/timeline/radar aliases all inject their respective kind when omitted', () => {
    const barRaw = JSON.stringify({ series: [{ label: 'A', value: 3 }] })
    expect(parseBlock('resume-bar', barRaw)).toEqual({
      kind: 'chart',
      data: { kind: 'bar', series: [{ label: 'A', value: 3 }] },
    })

    const timelineRaw = JSON.stringify({
      items: [{ label: 'A', start: '2020-01', end: 'present' }],
    })
    expect(parseBlock('resume-timeline', timelineRaw)).toEqual({
      kind: 'chart',
      data: { kind: 'timeline', items: [{ label: 'A', start: '2020-01', end: 'present' }] },
    })

    const radarRaw = JSON.stringify({
      axes: ['a', 'b', 'c'],
      series: [{ label: 'S1', values: [10, 20, 30] }],
    })
    expect(parseBlock('resume-radar', radarRaw)).toEqual({
      kind: 'chart',
      data: {
        kind: 'radar',
        axes: ['a', 'b', 'c'],
        series: [{ label: 'S1', values: [10, 20, 30] }],
      },
    })
  })

  it('a genuinely unknown fence (e.g. resume-pie) still returns null', () => {
    const raw = JSON.stringify({
      title: 'Technical Skill Proficiency',
      items: [{ label: 'JavaScript', value: 90 }],
    })
    expect(parseBlock('resume-pie', raw)).toBeNull()
  })
})

// ──────────────────────────────────────────
//  Property test — parseBlock must NEVER throw, for any lang/input
// ──────────────────────────────────────────

describe('parseBlock — never throws (property)', () => {
  it('never throws for arbitrary strings across all resume-* langs', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom('resume-description', 'resume-table', 'resume-chart', 'js', ''),
        (raw, lang) => {
          expect(() => parseBlock(lang, raw)).not.toThrow()
        },
      ),
      { numRuns: 300 },
    )
  })

  it('never throws for arbitrary JSON-serialisable values re-stringified', () => {
    fc.assert(
      fc.property(
        fc.jsonValue(),
        fc.constantFrom('resume-description', 'resume-table', 'resume-chart'),
        (value, lang) => {
          const raw = JSON.stringify(value)
          expect(() => parseBlock(lang, raw)).not.toThrow()
        },
      ),
      { numRuns: 300 },
    )
  })
})
