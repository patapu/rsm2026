'use client'

import type { TableBlockData } from './schema'

interface TableBlockProps {
  data: TableBlockData
}

/**
 * Renders a `resume-table` payload as a real semantic `<table>` — that IS
 * the accessible view, no `role="img"`/aria-label summary needed the way
 * the SVG charts require. Wrapped in `overflow-x-auto` since a 6-column
 * table can exceed the chat bubble's width.
 */
export default function TableBlock({ data }: TableBlockProps) {
  return (
    <div className="mb-2 bg-[rgba(5,5,10,0.9)] border border-[rgba(0,255,255,0.2)] rounded p-3 overflow-x-auto">
      {data.title && (
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider neon-text-cyan mb-2">
          {data.title}
        </h4>
      )}
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr>
            {data.columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className="text-left text-[#00FFFF] uppercase tracking-wide font-semibold px-2 py-1 border-b border-[rgba(0,255,255,0.3)] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[rgba(0,255,255,0.1)] last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="text-foreground px-2 py-1 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
