'use client'

import type { ChartBlockData } from './schema'
import BarChart from './BarChart'
import LevelChart from './LevelChart'
import TimelineChart from './TimelineChart'
import RadarChart from './RadarChart'

interface ChartBlockProps {
  data: ChartBlockData
}

/**
 * Dispatches a parsed `resume-chart` payload to the right hand-rolled SVG
 * chart by `kind`. Renders the shared title chrome once here so the four
 * chart components only need to own their own marks.
 */
export default function ChartBlock({ data }: ChartBlockProps) {
  return (
    <div className="mb-2 bg-[rgba(5,5,10,0.9)] border border-[rgba(0,255,255,0.2)] rounded p-3">
      {data.title && (
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider neon-text-cyan mb-2">
          {data.title}
        </h4>
      )}
      {data.kind === 'bar' && <BarChart data={data} />}
      {data.kind === 'level' && <LevelChart data={data} />}
      {data.kind === 'timeline' && <TimelineChart data={data} />}
      {data.kind === 'radar' && <RadarChart data={data} />}
    </div>
  )
}
