'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { markdownComponents } from './MarkdownContent'

interface TypewriterTextProps {
  text: string
  /** Characters revealed per second. ~55 cps reads like a fast terminal. */
  charsPerSecond?: number
  onDone?: () => void
}

interface MdastNode {
  type: string
  value?: string
  children?: MdastNode[]
}

function visitText(node: MdastNode, fn: (n: MdastNode) => void) {
  if (node.type === 'text' && typeof node.value === 'string') fn(node)
  if (node.children) for (const c of node.children) visitText(c, fn)
}

/**
 * Remark plugin: truncate combined text-node content to `maxChars`.
 * Preserves the AST shape, so partially-revealed markdown still renders as
 * proper React elements (bold, links, lists, code) — never raw `**`/`[]`.
 */
function makeTruncatePlugin(maxChars: number) {
  return function plugin() {
    return function transformer(tree: MdastNode) {
      let remaining = maxChars
      visitText(tree, (node) => {
        const v = node.value ?? ''
        if (remaining <= 0) {
          node.value = ''
        } else if (v.length > remaining) {
          node.value = v.slice(0, remaining)
          remaining = 0
        } else {
          remaining -= v.length
        }
      })
    }
  }
}

/**
 * Reveals markdown content character-by-character while keeping each token
 * rendered as its proper React element. Source `**bold**` becomes <strong>
 * even when only "bo" has been revealed.
 *
 * Uses text.length as the tick ceiling (a slight over-count vs visible chars
 * because markdown syntax doesn't render) — extra ticks past full reveal are
 * harmless and let onDone fire reliably.
 */
export default function TypewriterText({
  text,
  charsPerSecond = 55,
  onDone,
}: TypewriterTextProps) {
  const [shown, setShown] = useState(0)
  const doneFiredRef = useRef(false)
  const isDone = shown >= text.length

  useEffect(() => {
    setShown(0)
    doneFiredRef.current = false
  }, [text])

  useEffect(() => {
    if (isDone) {
      if (!doneFiredRef.current) {
        doneFiredRef.current = true
        onDone?.()
      }
      return
    }
    const id = setTimeout(() => setShown((s) => s + 1), 1000 / charsPerSecond)
    return () => clearTimeout(id)
  }, [shown, isDone, charsPerSecond, onDone])

  return (
    <div className="relative">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[makeTruncatePlugin(shown)]}
      >
        {text}
      </ReactMarkdown>
      {!isDone && (
        <span
          className="inline-block w-[2px] h-[1em] bg-[#00FFFF] ml-[1px] align-middle animate-pulse shadow-[0_0_4px_rgba(0,255,255,0.8)]"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
