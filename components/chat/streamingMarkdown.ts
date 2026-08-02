/**
 * Helpers for rendering Markdown that is still arriving.
 *
 * The AI emits rich chat blocks as fenced code with a `resume-*` info string
 * (see `components/chat/blocks/schema.ts`). Mid-stream, such a fence is a
 * half-written JSON payload: `parseBlock` rejects it and `MarkdownContent`
 * falls back to showing the raw text, so the visitor would watch a wall of JSON
 * type itself out and then vanish when the block completes.
 *
 * Plain fences (```ts, ```bash, …) are left alone — a partially streamed code
 * block reads fine and hiding it would be worse than showing it.
 */

/** Matches an opening/closing fence line and captures its info string. */
const FENCE_LINE_RE = /^ {0,3}(?:```|~~~)[ \t]*([^\s`~]*)/

/**
 * Truncates `text` just before an UNCLOSED `resume-*` fence, so a rich block is
 * only rendered once its closing fence has arrived. Text without an open
 * `resume-*` fence is returned unchanged.
 */
export function hideIncompleteResumeBlock(text: string): string {
  const lines = text.split('\n')

  let openLang: string | null = null
  let openOffset = 0
  let offset = 0

  for (const line of lines) {
    if (FENCE_LINE_RE.test(line)) {
      if (openLang === null) {
        openLang = FENCE_LINE_RE.exec(line)?.[1] ?? ''
        openOffset = offset
      } else {
        // Closing fence — the block is complete and safe to render.
        openLang = null
      }
    }
    offset += line.length + 1 // +1 for the '\n' consumed by split
  }

  if (openLang !== null && openLang.startsWith('resume-')) {
    return text.slice(0, openOffset)
  }
  return text
}
