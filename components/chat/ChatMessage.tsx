'use client'

import { Card, CardContent } from '@heroui/react'
import ReactMarkdown from 'react-markdown'
import { markdownComponents } from './MarkdownContent'

export interface ChatMessageData {
  role: 'user' | 'assistant'
  content: string
}

interface ChatMessageProps {
  message: ChatMessageData
}

/**
 * Chat bubble component.
 * AI messages appear on the left (Card), user messages on the right (primary tint).
 * AI messages are rendered with react-markdown.
 */
export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      data-testid={`message-${message.role}`}
    >
      {isUser ? (
        <div className="max-w-[80%] rounded-lg px-3 py-2 bg-primary/20 text-foreground">
          <p className="text-sm">{message.content}</p>
        </div>
      ) : (
        <Card className="max-w-[80%] bg-default-100">
          <CardContent className="px-3 py-2">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
