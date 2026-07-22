'use client'

import type { TimelineChartData } from './schema'
import { SINGLE_SERIES_COLOR } from './palette'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { CHART_WIDTH, ROW_HEIGHT, LABEL_WIDTH, BAR_HEIGHT, MIN_BAR_WIDTH, Gridline, RowLabel } from './chartLayout'

interface TimelineChartProps {
  data: TimelineChartData
}

const RIGHT_MARGIN = 8
const AXIS_ROW_HEIGHT = 16

/** "YYYY-MM" (or the literal "present") to a comparable month index. */
function monthIndex(value: string): number {
  if (value === 'present') {
    const now = new Date()
    return now.getFullYear() * 12 + now.getMonth()
  }
  const [year, month] = value.split('-').map(Number)
  return year * 12 + (month - 1)
}

/** Inverse of `monthIndex` for the axis labels — "YYYY-MM". */
function formatMonthIndex(index: number): string {
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Horizontal single-series Gantt-style timeline — one track per item,
 * positioned against a shared date axis spanning every item. Only row names
 * are labelled directly on the marks; the recessive axis at the bottom
 * carries the date context so per-row labels stay to names only.
 */
export default function TimelineChart({ data }: TimelineChartProps) {
  const { t } = useLocale()
  const trackX = LABEL_WIDTH
  const trackWidth = CHART_WIDTH - LABEL_WIDTH - RIGHT_MARGIN
  const height = data.items.length * ROW_HEIGHT + AXIS_ROW_HEIGHT + 4

  const starts = data.items.map((it) => monthIndex(it.start))
  const ends = data.items.map((it) => monthIndex(it.end))
  const domainMin = Math.min(...starts)
  const domainMax = Math.max(...ends)
  const span = Math.max(1, domainMax - domainMin)

  const x = (month: number) => trackX + ((month - domainMin) / span) * trackWidth

  const domainMinLabel = data.items.some((it) => it.start === 'present')
    ? t('chat.blocks.timelinePresent')
    : formatMonthIndex(domainMin)
  const domainMaxLabel = data.items.some((it) => it.end === 'present')
    ? t('chat.blocks.timelinePresent')
    : formatMonthIndex(domainMax)

  const summary = `Timeline${data.title ? `: ${data.title}` : ''}. ${data.items
    .map((it) => `${it.label}: ${it.start} to ${it.end}${it.detail ? ` — ${it.detail}` : ''}`)
    .join(', ')}`

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} width="100%" role="img" aria-label={summary} className="block">
      <title>{summary}</title>
      {data.items.map((it, i) => {
        const y = i * ROW_HEIGHT + ROW_HEIGHT / 2
        const startX = x(monthIndex(it.start))
        const endX = x(monthIndex(it.end))
        const w = Math.max(MIN_BAR_WIDTH, endX - startX)
        return (
          <g key={`${it.label}-${i}`}>
            <Gridline trackX={trackX} trackWidth={trackWidth} y={y} />
            <rect x={startX} y={y - BAR_HEIGHT / 2} width={w} height={BAR_HEIGHT} rx={4} fill={SINGLE_SERIES_COLOR} />
            <RowLabel trackX={trackX} y={y} label={it.label} />
          </g>
        )
      })}

      {/* Recessive date axis — the only place dates are shown, so per-row marks stay to row names only. */}
      <text
        x={trackX}
        y={height - 4}
        fill="currentColor"
        className="text-foreground-500 font-mono text-[9px]"
        opacity={0.6}
      >
        {domainMinLabel}
      </text>
      <text
        x={trackX + trackWidth}
        y={height - 4}
        textAnchor="end"
        fill="currentColor"
        className="text-foreground-500 font-mono text-[9px]"
        opacity={0.6}
      >
        {domainMaxLabel}
      </text>
    </svg>
  )
}
