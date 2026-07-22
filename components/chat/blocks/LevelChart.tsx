'use client'

import type { LevelChartData } from './schema'
import { SINGLE_SERIES_COLOR } from './palette'
import { formatValue } from './format'
import { CHART_WIDTH, ROW_HEIGHT, LABEL_WIDTH, BAR_HEIGHT, MIN_BAR_WIDTH, Gridline, RowLabel } from './chartLayout'

interface LevelChartProps {
  data: LevelChartData
}

const VALUE_WIDTH = 40
const DOMAIN_MAX = 100

/**
 * Horizontal 0–100 level/gauge chart — one bar per item, always scaled
 * against a fixed 0–100 domain (not the items' own max, unlike `BarChart`),
 * since a "level" is a percentage-style reading. Values are labelled
 * directly at the bar's end.
 */
export default function LevelChart({ data }: LevelChartProps) {
  const trackX = LABEL_WIDTH
  const trackWidth = CHART_WIDTH - LABEL_WIDTH - VALUE_WIDTH
  const height = data.items.length * ROW_HEIGHT + 6

  const summary = `Level chart${data.title ? `: ${data.title}` : ''}. ${data.items
    .map((it) => `${it.label}: ${formatValue(it.value)}%`)
    .join(', ')}`

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} width="100%" role="img" aria-label={summary} className="block">
      <title>{summary}</title>
      {data.items.map((it, i) => {
        const y = i * ROW_HEIGHT + ROW_HEIGHT / 2
        const w = Math.max(MIN_BAR_WIDTH, (it.value / DOMAIN_MAX) * trackWidth)
        return (
          <g key={`${it.label}-${i}`}>
            <Gridline trackX={trackX} trackWidth={trackWidth} y={y} />
            <rect x={trackX} y={y - BAR_HEIGHT / 2} width={w} height={BAR_HEIGHT} rx={4} fill={SINGLE_SERIES_COLOR} />
            <RowLabel trackX={trackX} y={y} label={it.label} />
            <text
              x={trackX + w + 6}
              y={y}
              dominantBaseline="middle"
              fill="currentColor"
              className="text-foreground-500 font-mono text-[10px]"
            >
              {formatValue(it.value)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
