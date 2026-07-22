/**
 * components/chat/blocks/palette.ts — validated cyberpunk chart palette.
 *
 * These colours were run through the dataviz skill's validator (lightness
 * band, chroma floor, CVD separation, normal-vision floor, contrast) against
 * the dark chat-bubble surface below and passed all six checks. Do not
 * invent new colours here and do not reorder the slots — see the rules on
 * each export.
 */

/** Dark chat-bubble surface these colours were validated against. */
export const CHAT_SURFACE = '#0D0D1A'

/**
 * Fixed-order palette slots. Assignment is always in this order — slot1
 * first, slot2 second, and so on — never cycled and never reordered by
 * value or rank. Colour follows the entity (the series/category it
 * represents), not its position in a sorted list.
 *
 * The raw brand neon (`#00FFFF` / `#FF00FF`) is intentionally NOT here — at
 * L 0.905/0.702 it falls outside the validated 0.48–0.67 dark-surface
 * lightness band and must not be used as a fill. It stays reserved for
 * glow/stroke/accent-text elsewhere in the chat chrome.
 */
export const PALETTE_SLOTS = [
  '#0AAAAA', // slot1 — cyan
  '#D11AD1', // slot2 — magenta
  '#C88214', // slot3 — amber
  '#8069DE', // slot4 — violet
] as const

/**
 * Single-series marks (bar, level, timeline) always use slot1 — one hue
 * means no CVD risk, and no legend box is needed since the block's title
 * (or the row/category labels) already names what's being shown.
 */
export const SINGLE_SERIES_COLOR: string = PALETTE_SLOTS[0]

/**
 * Returns the fixed-order palette colour for a zero-based series index.
 * Radar is the only multi-series chart these blocks render, and it is
 * hard-capped at 2 series in the schema — of the four slots, only slot1
 * (cyan) + slot2 (magenta) clear the all-pairs CVD adjacency check that a
 * radar's overlapping fills require, so callers must never request an
 * index beyond that cap.
 */
export function seriesColor(index: number): string {
  return PALETTE_SLOTS[index] ?? PALETTE_SLOTS[PALETTE_SLOTS.length - 1]
}
