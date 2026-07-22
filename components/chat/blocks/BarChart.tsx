'use client'

import type { BarChartData } from './schema'
import { SINGLE_SERIES_COLOR } from './palette'
import { formatValue } from './format'
import { CHART_WIDTH, ROW_HEIGHT, LABEL_WIDTH, BAR_HEIGHT, MIN_BAR_WIDTH, Gridline, RowLabel } from './chartLayout'

interface BarChartProps {
  data: BarChartData
}

const VALUE_WIDTH = 48

/**
 * Horizontal single-series bar chart — one bar per `series` item, scaled
 * against the series' own max value. Values are labelled directly at the
 * bar's end (the point of a bar chart); category labels sit to the left.
 */
export default function BarChart({ data }: BarChartProps) {
  const trackX = LABEL_WIDTH
  const trackWidth = CHART_WIDTH - LABEL_WIDTH - VALUE_WIDTH
  const height = data.series.length * ROW_HEIGHT + 6
  const max = Math.max(0, ...data.series.map((s) => s.value)) || 1

  const summary = `Bar chart${data.title ? `: ${data.title}` : ''}. ${data.series
    .map((s) => `${s.label}: ${formatValue(s.value)}${data.unit ? ` ${data.unit}` : ''}`)
    .join(', ')}`

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} width="100%" role="img" aria-label={summary} className="block">
      <title>{summary}</title>
      {data.series.map((s, i) => {
        const y = i * ROW_HEIGHT + ROW_HEIGHT / 2
        const w = Math.max(MIN_BAR_WIDTH, (Math.max(0, s.value) / max) * trackWidth)
        return (
          <g key={`${s.label}-${i}`}>
            <Gridline trackX={trackX} trackWidth={trackWidth} y={y} />
            <rect x={trackX} y={y - BAR_HEIGHT / 2} width={w} height={BAR_HEIGHT} rx={4} fill={SINGLE_SERIES_COLOR} />
            <RowLabel trackX={trackX} y={y} label={s.label} />
            <text
              x={trackX + w + 6}
              y={y}
              dominantBaseline="middle"
              fill="currentColor"
              className="text-foreground-500 font-mono text-[10px]"
            >
              {formatValue(s.value)}
              {data.unit ? ` ${data.unit}` : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
