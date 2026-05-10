'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage, { type ChatMessageData } from './ChatMessage'

/**
 * Full-page chat slide — takes up the entire viewport as the first slide.
 * Same logic as ChatWidget but displayed full-screen instead of a floating panel.
 */
export default function ChatSlide() {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Ensure fingerprint cookie exists on mount
  useEffect(() => {
    ensureFingerprint()
  }, [])

  const ensureFingerprint = async () => {
    try {
      await fetch('/api/auth/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ua: navigator.userAgent,
          lang: navigator.language,
          screenHint: `${screen.width}x${screen.height}`,
        }),
      })
    } catch {
      // Silently fail — will retry on 401
    }
  }

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: ChatMessageData = {
      role: 'user',
      content: messageText.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      })

      if (response.status === 401) {
        await ensureFingerprint()
        const retryResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage.content }),
        })

        if (!retryResponse.ok) {
          handleErrorResponse(retryResponse.status)
          return
        }

        const data = await retryResponse.json()
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply },
        ])
        return
      }

      if (!response.ok) {
        handleErrorResponse(response.status)
        return
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ])
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const handleErrorResponse = (status: number) => {
    if (status === 429) {
      setError('คุณส่งข้อความบ่อยเกินไป กรุณารอสักครู่')
    } else {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full" data-testid="chat-slide">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-accent" />
        <h1 className="text-lg font-medium text-text">
          ถามอะไรเกี่ยวกับเกื้อได้เลย
        </h1>
        <span className="text-xs text-muted ml-auto">
          เลื่อนไปขวาเพื่อดูเรซูเม่ →
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-muted text-sm max-w-xs">
              สวัสดีครับ! ถามอะไรเกี่ยวกับประสบการณ์หรือทักษะของผมได้เลย
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-surface border border-border rounded-lg px-3 py-2">
              <span className="text-sm text-muted animate-pulse">
                กำลังพิมพ์...
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center mb-3">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-border max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
            disabled={isLoading}
            data-testid="chat-input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-accent text-bg rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="chat-send"
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  )
}
