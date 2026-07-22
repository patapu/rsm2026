/**
 * components/chat/blocks/format.ts — small formatting helpers shared by the
 * hand-rolled chart SVGs. There's no charting library in play here (see the
 * dataviz task spec — inline SVG, no new dependencies), so there's no
 * built-in axis/label formatting to lean on either.
 */

/**
 * Truncates a label to `maxChars` characters with an ellipsis, so long
 * AI-authored labels can't overflow the fixed space reserved for them in a
 * chart SVG. Labels/values in the charts are always set in the mono font
 * specifically so this character-count heuristic tracks actual rendered
 * width closely enough.
 */
export function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`
}

/**
 * Compact numeric formatting for value labels — integers print bare,
 * everything else keeps one decimal place.
 */
export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
