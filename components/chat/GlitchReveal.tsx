'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { markdownComponents } from './MarkdownContent'

interface GlitchRevealProps {
  text: string
  /** Entrance animation length in ms. Kept in sync with the `.cyber-reveal` CSS. */
  durationMs?: number
  onDone?: () => void
}

/**
 * Cyberpunk entrance for a NEW assistant message.
 *
 * Unlike the old typewriter, the FULL markdown is present in the DOM from the
 * first frame — it renders as proper React elements (bold, links, code) exactly
 * like the non-streaming branch. The "reveal" is a one-shot CSS glitch/flicker
 * (RGB channel-split + scanline sweep) on the wrapper that settles to clean,
 * legible text. `onDone` fires once the entrance completes so the parent can
 * advance its typed-index tracking.
 *
 * Respects prefers-reduced-motion: the animation is skipped by CSS and `onDone`
 * fires immediately.
 */
export default function GlitchReveal({
  text,
  durationMs = 650,
  onDone,
}: GlitchRevealProps) {
  // Keep the latest onDone without making the effect depend on its identity
  // (the parent passes a fresh closure every render).
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = prefersReduced ? 0 : durationMs
    const id = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onDoneRef.current?.()
      }
    }, delay)
    return () => clearTimeout(id)
  }, [text, durationMs])

  return (
    <div className="cyber-reveal">
      <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
    </div>
  )
}
