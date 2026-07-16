'use client'

import { Card, CardContent } from '@heroui/react'
import ReactMarkdown from 'react-markdown'
import { markdownComponents } from './MarkdownContent'
import GlitchReveal from './GlitchReveal'

export interface ChatMessageData {
  role: 'user' | 'assistant'
  content: string
}

interface ChatMessageProps {
  message: ChatMessageData
  /**
   * When true and role is 'assistant', the message plays a one-shot cyberpunk
   * entrance (glitch/RGB-split/scanline). The full content is in the DOM
   * immediately — no per-character reveal.
   */
  isStreaming?: boolean
  onDoneStreaming?: () => void
}

/**
 * Chat bubble component.
 * AI messages appear on the left (Card), user messages on the right (cyan neon tint).
 * AI messages render with react-markdown; a NEW reply additionally plays a
 * cyberpunk entrance effect via GlitchReveal.
 */
export default function ChatMessage({
  message,
  isStreaming = false,
  onDoneStreaming,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      data-testid={`message-${message.role}`}
    >
      {isUser ? (
        <div className="max-w-[80%] rounded-lg px-3 py-2 bg-[rgba(0,255,255,0.15)] border border-[rgba(0,255,255,0.4)] shadow-[0_0_8px_rgba(0,255,255,0.2)] text-foreground font-sans">
          <p className="text-sm">{message.content}</p>
        </div>
      ) : (
        <Card className="max-w-[80%] bg-[rgba(13,13,26,0.6)] border border-[rgba(255,0,255,0.3)] shadow-[0_0_8px_rgba(255,0,255,0.15)]">
          <CardContent className="px-3 py-2">
            {isStreaming ? (
              <GlitchReveal text={message.content} onDone={onDoneStreaming} />
            ) : (
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
