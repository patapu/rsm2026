'use client'

import type { DescriptionBlockData } from './schema'

interface DescriptionBlockProps {
  data: DescriptionBlockData
}

/**
 * Renders a `resume-description` payload as a real `<dl>` — a semantic
 * term/detail list, styled to read as part of the assistant's message card.
 */
export default function DescriptionBlock({ data }: DescriptionBlockProps) {
  return (
    <div className="mb-2 bg-[rgba(5,5,10,0.9)] border border-[rgba(0,255,255,0.2)] rounded p-3">
      {data.title && (
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider neon-text-cyan mb-2">
          {data.title}
        </h4>
      )}
      <dl>
        {data.items.map((item, i) => (
          <div key={i} className="mb-2 last:mb-0">
            <dt className="font-mono text-xs uppercase tracking-wide text-[#00FFFF]">{item.term}</dt>
            <dd className="text-sm text-foreground mt-0.5">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
