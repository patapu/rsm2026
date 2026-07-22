'use client'

/**
 * components/chat/blocks/chartLayout.tsx — shared layout constants + row
 * markup for the three horizontal single-series charts: `BarChart`,
 * `LevelChart`, `TimelineChart`. All three lay out one row per item against
 * a shared left-hand label column and a recessive gridline, so the
 * constants and that row markup live here instead of being redeclared
 * (and drifting) three times.
 *
 * `RadarChart` is intentionally NOT part of this module — it's a polar
 * layout with a genuinely different geometry, not a fourth near-duplicate.
 */

import { truncateLabel } from './format'

/** Shared SVG viewBox width every horizontal row chart renders at. */
export const CHART_WIDTH = 400
/** Vertical space allotted to each row (a bar/level item, a timeline track). */
export const ROW_HEIGHT = 26
/** Left column reserved for the row's category/item label. */
export const LABEL_WIDTH = 96
/** Bar/track thickness. */
export const BAR_HEIGHT = 8
/** Floor so a near-zero value (or a near-instant timeline span) still renders a visible mark. */
export const MIN_BAR_WIDTH = 8
/** Row labels are truncated to this many characters before rendering — unlike table/description text, which isn't truncated at all. */
export const LABEL_MAX_CHARS = 14

interface GridlineProps {
  trackX: number
  trackWidth: number
  y: number
}

/** Recessive full-width horizontal gridline behind a row's bar/track. */
export function Gridline({ trackX, trackWidth, y }: GridlineProps) {
  return (
    <line
      x1={trackX}
      y1={y}
      x2={trackX + trackWidth}
      y2={y}
      stroke="currentColor"
      strokeWidth={1}
      className="text-foreground-500"
      opacity={0.15}
    />
  )
}

interface RowLabelProps {
  trackX: number
  y: number
  label: string
}

/** Row's category/item name, right-aligned against the track and truncated to `LABEL_MAX_CHARS`. */
export function RowLabel({ trackX, y, label }: RowLabelProps) {
  return (
    <text
      x={trackX - 8}
      y={y}
      textAnchor="end"
      dominantBaseline="middle"
      fill="currentColor"
      className="text-foreground font-mono text-[10px]"
    >
      {truncateLabel(label, LABEL_MAX_CHARS)}
    </text>
  )
}
