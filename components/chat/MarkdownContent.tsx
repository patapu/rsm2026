'use client'

import type { Components } from 'react-markdown'
import { parseBlock } from './blocks/schema'
import DescriptionBlock from './blocks/DescriptionBlock'
import TableBlock from './blocks/TableBlock'
import ChartBlock from './blocks/ChartBlock'

/**
 * Fence languages that carry a rich chat block as JSON (see
 * `components/chat/blocks/schema.ts`). Matched against a `code` element's
 * `language-xxx` className.
 *
 * `resume-bar` / `resume-level` / `resume-timeline` / `resume-radar` are
 * accepted as ALIASES for `resume-chart` — defence-in-depth for an observed
 * production failure where the model invented a fence name from a chart's
 * `kind` (e.g. ` ```resume-level `) instead of emitting the real
 * `resume-chart` fence with `"kind"` inside the JSON. `parseBlock` in
 * schema.ts derives/injects the `kind` from the alias when the payload omits
 * it; the payload's own explicit `kind` field always wins if present.
 */
const RESUME_BLOCK_LANG_RE = /language-(resume-(?:description|table|chart|bar|level|timeline|radar))(?=\s|$)/

/** Flattens a `code` element's `children` (string, or array of strings) back into raw text. Never throws — anything else collapses to `''`. */
function childrenToRawText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(childrenToRawText).join('')
  return ''
}

/**
 * Reads the resume-* fence language off a `pre`'s child WITHOUT rendering
 * it. react-markdown v9 (via hast-util-to-jsx-runtime, `passNode`/`jsx`
 * runtime) hands `pre` its `code` child as an already-constructed-but-not-
 * yet-invoked React element — `child.props.className` is a plain object
 * property at this point, readable directly, no need to execute/render the
 * `code` component first to find out what it is.
 */
function getResumeBlockLang(children: React.ReactNode): string | null {
  const child = Array.isArray(children) ? children[0] : children
  const props = (child as { props?: { className?: string } } | null | undefined)?.props
  const match = props?.className?.match(RESUME_BLOCK_LANG_RE)
  return match ? match[1] : null
}

/**
 * Styled component map for Markdown elements rendered in chat messages.
 * Uses cyberpunk neon theming for consistent visual identity.
 */
export const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 text-sm leading-relaxed text-foreground">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold mb-2 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold mb-1 text-foreground">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-2 text-sm space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-2 text-sm space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-foreground">{children}</li>
  ),
  code: ({ children, className }) => {
    const resumeLang = className?.match(RESUME_BLOCK_LANG_RE)?.[1]

    if (resumeLang) {
      const parsed = parseBlock(resumeLang, childrenToRawText(children))
      if (parsed) {
        if (parsed.kind === 'description') return <DescriptionBlock data={parsed.data} />
        if (parsed.kind === 'table') return <TableBlock data={parsed.data} />
        return <ChartBlock data={parsed.data} />
      }
      // Malformed payload (bad JSON, schema violation, mismatched row/axis
      // lengths) — fall back to rendering the original text exactly like a
      // normal fenced code block. The `pre` override below skips wrapping
      // resume-* languages, so this branch supplies the same <pre><code>
      // shell react-markdown would otherwise have produced by default.
      return (
        <pre className="mb-2 overflow-x-auto">
          <code className="block bg-[rgba(5,5,10,0.9)] border border-[rgba(0,255,255,0.2)] rounded p-3 text-xs font-mono overflow-x-auto text-foreground">
            {children}
          </code>
        </pre>
      )
    }

    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-[rgba(5,5,10,0.9)] border border-[rgba(0,255,255,0.2)] rounded p-3 text-xs font-mono overflow-x-auto text-foreground">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-[rgba(0,255,255,0.1)] border border-[rgba(0,255,255,0.3)] rounded px-1 py-0.5 text-xs font-mono text-[#00FFFF]">
        {children}
      </code>
    )
  },
  pre: ({ children }) => {
    const lang = getResumeBlockLang(children)
    if (lang) {
      // The `code` renderer above owns the wrapper for resume-* blocks
      // (either the rich block itself, or its own <pre><code> shell on
      // malformed data) — wrapping it again here would nest <pre> inside
      // <pre>, which is invalid and would inherit unwanted `pre` styling.
      return <>{children}</>
    }
    return <pre className="mb-2 overflow-x-auto">{children}</pre>
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground-500">{children}</em>
  ),
}
