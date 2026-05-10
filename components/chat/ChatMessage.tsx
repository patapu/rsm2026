'use client'

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
 * AI messages appear on the left, user messages on the right.
 * AI messages are rendered with react-markdown.
 */
export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-accent/20 text-text'
            : 'bg-surface text-text border border-border'
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
