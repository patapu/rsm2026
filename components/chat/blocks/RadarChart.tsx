'use client'

import type { RadarChartData } from './schema'
import { CHAT_SURFACE, seriesColor } from './palette'
import { truncateLabel } from './format'

interface RadarChartProps {
  data: RadarChartData
}

const WIDTH = 300
const HEIGHT = 280
const CENTER_X = WIDTH / 2
const CENTER_Y = 130
const RADIUS = 88
const RING_COUNT = 3
const AXIS_LABEL_MAX_CHARS = 12
const VERTEX_MARKER_RADIUS = 4

function pointAt(angle: number, radius: number): [number, number] {
  return [CENTER_X + radius * Math.cos(angle), CENTER_Y + radius * Math.sin(angle)]
}

function angleForAxis(index: number, total: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total
}

/**
 * Radar/spider chart — 1 or 2 series (schema-capped, see palette.ts) plotted
 * across shared axes. Axis names are the only labels drawn directly on the
 * chart; a multi-series comparison additionally gets a small HTML legend
 * below the SVG, since colour alone can't be named by the block title once
 * there's more than one series.
 */
export default function RadarChart({ data }: RadarChartProps) {
  const n = data.axes.length

  const ringPoints = (ringIndex: number) => {
    const radius = (RADIUS * ringIndex) / RING_COUNT
    return Array.from({ length: n }, (_, i) => pointAt(angleForAxis(i, n), radius))
      .map(([x, y]) => `${x},${y}`)
      .join(' ')
  }

  const seriesPoints = (values: number[]) =>
    values
      .map((v, i) => pointAt(angleForAxis(i, n), (Math.max(0, Math.min(100, v)) / 100) * RADIUS))
      .map(([x, y]) => `${x},${y}`)
      .join(' ')

  const summary = `Radar chart${data.title ? `: ${data.title}` : ''} across ${data.axes.join(', ')}. ${data.series
    .map((s) => `${s.label}: ${s.values.join(', ')}`)
    .join('; ')}`

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label={summary} className="block">
        <title>{summary}</title>

        {/* Recessive grid rings */}
        {Array.from({ length: RING_COUNT }, (_, ring) => (
          <polygon
            key={ring}
            points={ringPoints(ring + 1)}
            fill="none"
            stroke="currentColor"
            className="text-foreground-500"
            strokeWidth={1}
            opacity={0.15}
          />
        ))}

        {/* Recessive axis spokes + axis-name labels */}
        {data.axes.map((axis, i) => {
          const angle = angleForAxis(i, n)
          const [x, y] = pointAt(angle, RADIUS)
          const [lx, ly] = pointAt(angle, RADIUS + 14)
          const cos = Math.cos(angle)
          const anchor = cos > 0.15 ? 'start' : cos < -0.15 ? 'end' : 'middle'
          return (
            <g key={`${axis}-${i}`}>
              <line
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={x}
                y2={y}
                stroke="currentColor"
                className="text-foreground-500"
                strokeWidth={1}
                opacity={0.15}
              />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="currentColor"
                className="text-foreground font-mono text-[9px]"
              >
                {truncateLabel(axis, AXIS_LABEL_MAX_CHARS)}
              </text>
            </g>
          )
        })}

        {/* Series fills — a surface-coloured halo stroke first keeps overlapping fills visually separated. */}
        {data.series.map((s, i) => {
          const color = seriesColor(i)
          const points = seriesPoints(s.values)
          return (
            <g key={`${s.label}-${i}`}>
              <polygon points={points} fill="none" stroke={CHAT_SURFACE} strokeWidth={4} strokeLinejoin="round" />
              <polygon
                points={points}
                fill={color}
                fillOpacity={0.16}
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {s.values.map((v, vi) => {
                const [vx, vy] = pointAt(angleForAxis(vi, n), (Math.max(0, Math.min(100, v)) / 100) * RADIUS)
                return <circle key={vi} cx={vx} cy={vy} r={VERTEX_MARKER_RADIUS} fill={color} />
              })}
            </g>
          )
        })}
      </svg>

      {data.series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 px-1">
          {data.series.map((s, i) => (
            <span key={`${s.label}-${i}`} className="flex items-center gap-1.5 text-[10px] font-mono text-foreground-500">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: seriesColor(i) }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
