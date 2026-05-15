'use client'

import type { Components } from 'react-markdown'

/**
 * Styled component map for Markdown elements rendered in chat messages.
 * Uses HeroUI design tokens for consistent theming.
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
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-default-50 rounded p-2 text-xs font-mono overflow-x-auto text-foreground">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-default-50 rounded px-1 py-0.5 text-xs font-mono text-primary">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto">{children}</pre>
  ),
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
