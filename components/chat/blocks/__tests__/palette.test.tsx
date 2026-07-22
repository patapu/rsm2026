// @vitest-environment jsdom

/**
 * components/chat/blocks/palette.test.tsx — palette invariants.
 *
 *  1. `seriesColor()` assigns slots in fixed order and never cycles past the
 *     last defined slot.
 *  2. The raw brand neon (`#00FFFF` / `#FF00FF`) is never used as a `fill`
 *     value by any chart component — it falls outside the validated
 *     lightness band and is reserved for glow/stroke/accent-text only.
 *  3. A property test over arbitrary valid chart payloads asserts every
 *     `fill="..."` rendered by ChartBlock is a member of the documented
 *     palette (PALETTE_SLOTS), for every chart kind.
 */
import { describe, it, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { PALETTE_SLOTS, SINGLE_SERIES_COLOR, seriesColor, CHAT_SURFACE } from '../palette'
import ChartBlock from '../ChartBlock'
import type { ChartBlockData } from '../schema'

const BRAND_NEON = ['#00FFFF', '#FF00FF']

// ──────────────────────────────────────────
//  seriesColor — fixed order, no cycling
// ──────────────────────────────────────────

describe('seriesColor — fixed-order slot assignment', () => {
  it('assigns slot0/slot1 for index 0/1 (the only indices radar ever requests)', () => {
    expect(seriesColor(0)).toBe(PALETTE_SLOTS[0])
    expect(seriesColor(1)).toBe(PALETTE_SLOTS[1])
  })

  it('maps [0, 1, 2, 3] to PALETTE_SLOTS in order (never reordered)', () => {
    expect([0, 1, 2, 3].map(seriesColor)).toEqual([...PALETTE_SLOTS])
  })

  it('never cycles back to slot0 for an index beyond the palette length', () => {
    fc.assert(
      fc.property(fc.integer({ min: PALETTE_SLOTS.length, max: 1000 }), (index) => {
        const color = seriesColor(index)
        // A cycling (modulo) implementation would wrap back to slot0 for
        // index === PALETTE_SLOTS.length; the real implementation clamps to
        // the last slot instead.
        expect(color).toBe(PALETTE_SLOTS[PALETTE_SLOTS.length - 1])
      }),
      { numRuns: 100 },
    )
  })

  it('SINGLE_SERIES_COLOR is exactly slot1 (cyan)', () => {
    expect(SINGLE_SERIES_COLOR).toBe(PALETTE_SLOTS[0])
  })
})

// ──────────────────────────────────────────
//  Brand neon must never appear as a fill
// ──────────────────────────────────────────

/**
 * Collects `fill` attribute values that are actual colour marks (the palette
 * this test locks down), excluding `none` (no-fill outlines) and
 * `currentColor` (grid lines / axis text, which intentionally follow the
 * surrounding text colour rather than the chart palette).
 */
function fillsOf(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[fill]'))
    .map((el) => el.getAttribute('fill'))
    .filter((v): v is string => !!v && v !== 'none' && v !== 'currentColor')
}

describe('brand neon is never used as a fill value', () => {
  it('CHAT_SURFACE (the halo stroke colour) is not one of the brand neons', () => {
    expect(BRAND_NEON.map((c) => c.toLowerCase())).not.toContain(CHAT_SURFACE.toLowerCase())
  })

  it('none of PALETTE_SLOTS is a brand neon colour', () => {
    for (const slot of PALETTE_SLOTS) {
      expect(BRAND_NEON.map((c) => c.toLowerCase())).not.toContain(slot.toLowerCase())
    }
  })

  const cases: Array<{ name: string; data: ChartBlockData }> = [
    {
      name: 'bar',
      data: { kind: 'bar', series: [{ label: 'A', value: 5 }, { label: 'B', value: 10 }] },
    },
    {
      name: 'level',
      data: { kind: 'level', items: [{ label: 'A', value: 40 }, { label: 'B', value: 90 }] },
    },
    {
      name: 'timeline',
      data: {
        kind: 'timeline',
        items: [{ label: 'A', start: '2020-01', end: 'present' }],
      },
    },
    {
      name: 'radar',
      data: {
        kind: 'radar',
        axes: ['a', 'b', 'c'],
        series: [
          { label: 'S1', values: [10, 20, 30] },
          { label: 'S2', values: [40, 50, 60] },
        ],
      },
    },
  ]

  it.each(cases)('$name chart never fills with brand neon', ({ data }) => {
    const { container, unmount } = render(<ChartBlock data={data} />)
    const fills = fillsOf(container)
    expect(fills.length).toBeGreaterThan(0)
    for (const fill of fills) {
      expect(BRAND_NEON.map((c) => c.toLowerCase())).not.toContain(fill.toLowerCase())
    }
    unmount()
  })
})

// ──────────────────────────────────────────
//  Property test — every fill on a valid arbitrary payload is in the palette
// ──────────────────────────────────────────

const labelArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0)
const finiteNumberArb = fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true })
const levelValueArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
const monthArb = fc.constantFrom('2019-01', '2020-06', '2022-12', 'present')

const barPayloadArb: fc.Arbitrary<ChartBlockData> = fc.record({
  kind: fc.constant('bar' as const),
  title: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  unit: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: undefined }),
  series: fc.array(fc.record({ label: labelArb, value: finiteNumberArb }), {
    minLength: 1,
    maxLength: 12,
  }),
})

const levelPayloadArb: fc.Arbitrary<ChartBlockData> = fc.record({
  kind: fc.constant('level' as const),
  title: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  items: fc.array(fc.record({ label: labelArb, value: levelValueArb }), {
    minLength: 1,
    maxLength: 12,
  }),
})

const timelinePayloadArb: fc.Arbitrary<ChartBlockData> = fc.record({
  kind: fc.constant('timeline' as const),
  title: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  items: fc.array(
    fc.record({
      label: labelArb,
      start: monthArb,
      end: monthArb,
      detail: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 10 },
  ),
})

const radarPayloadArb: fc.Arbitrary<ChartBlockData> = fc
  .integer({ min: 3, max: 8 })
  .chain((axisCount) => {
    const axes = fc.array(labelArb, { minLength: axisCount, maxLength: axisCount })
    const oneSeries = axes.chain((axesVal) =>
      fc.record({
        label: labelArb,
        values: fc.array(levelValueArb, { minLength: axesVal.length, maxLength: axesVal.length }),
      }),
    )
    return fc.record({
      kind: fc.constant('radar' as const),
      title: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      axes,
      series: fc.array(oneSeries, { minLength: 1, maxLength: 2 }),
    })
  })

describe('property: every rendered fill on a valid payload is a documented palette colour', () => {
  const chartArb = fc.oneof(barPayloadArb, levelPayloadArb, timelinePayloadArb, radarPayloadArb)

  it('fill attributes are always members of PALETTE_SLOTS', () => {
    fc.assert(
      fc.property(chartArb, (data) => {
        const { container, unmount } = render(<ChartBlock data={data} />)
        try {
          const fills = fillsOf(container)
          for (const fill of fills) {
            expect(PALETTE_SLOTS as readonly string[]).toContain(fill)
          }
        } finally {
          unmount()
          cleanup()
        }
      }),
      { numRuns: 50 },
    )
  })
})
