'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage, { type ChatMessageData } from './ChatMessage'

/**
 * Floating chat widget — circle button at bottom-right.
 * Opens a slide-up panel (360px × 480px) with chat interface.
 * Calls POST /api/auth/fingerprint on mount if no cookie exists.
 * Calls POST /api/chat when user sends a message.
 * Error states: 401 auto-retry, 429 message, 5xx message.
 */
export default function ChatWidget({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const [isOpen, setIsOpen] = useState(false)
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

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Ensure fingerprint cookie exists on mount, then load history
  useEffect(() => {
    const init = async () => {
      await ensureFingerprint()
      await loadHistory()
    }
    init()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/chat', { credentials: 'same-origin' })
      if (res.status === 401) {
        // Cookie might not be set yet, retry after fingerprint
        await ensureFingerprint()
        const retry = await fetch('/api/chat', { credentials: 'same-origin' })
        if (retry.ok) {
          const data = await retry.json()
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
        return
      }
      if (res.ok) {
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages)
        }
      }
    } catch {
      // Silently fail — history is non-critical
    }
  }

  const ensureFingerprint = async () => {
    // Check if fp_token cookie exists (we can't read httpOnly cookies,
    // so we just call the endpoint — it's idempotent)
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
        // Auto-retry: refresh fingerprint and retry once
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

  const handleSendClick = () => {
    sendMessage(input)
  }

  return (
    <>
      {/* Floating button — inverted color: dark slide → white btn, light slide → black btn */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 animate-chat-btn-pop ${
          isOpen
            ? theme === 'dark'
              ? 'bg-white text-black hover:bg-gray-200'
              : 'bg-black text-white hover:bg-gray-800'
            : theme === 'dark'
              ? 'bg-white text-black hover:bg-gray-200 animate-chat-btn-pulse'
              : 'bg-black text-white hover:bg-gray-800 animate-chat-btn-pulse'
        }`}
        aria-label="เปิดแชท"
        data-testid="chat-toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-0'}`}
        >
          {isOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </>
          )}
        </svg>
      </button>

      {/* Chat panel — two-tone black & white */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] h-[480px] bg-black border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-chat-panel-slide"
          data-testid="chat-panel"
        >
          {/* Header — white on black */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 bg-black">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-sm font-medium text-white">
              ถามอะไรเกี่ยวกับเกื้อได้เลย
            </span>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-black">
            {messages.length === 0 && (
              <p className="text-gray-500 text-sm text-center mt-8">
                สวัสดีครับ! ถามอะไรเกี่ยวกับประสบการณ์หรือทักษะของผมได้เลย
              </p>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-400 animate-pulse">
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

          {/* Input area — white accents on black */}
          <div className="px-4 py-3 border-t border-gray-800 flex gap-2 bg-black">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <button
              onClick={handleSendClick}
              disabled={isLoading || !input.trim()}
              className="px-3 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              data-testid="chat-send"
            >
              ส่ง
            </button>
          </div>
        </div>
      )}
    </>
  )
}
