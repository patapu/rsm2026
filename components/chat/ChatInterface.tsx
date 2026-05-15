'use client'

import { Input, Button } from '@heroui/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import ChatMessage, { type ChatMessageData } from './ChatMessage'

/**
 * Maps an HTTP error status code to a user-facing error message.
 * Returns null if the status code does not map to a known error.
 */
export function getErrorMessage(status: number): string | null {
  if (status === 429) return 'คุณส่งข้อความบ่อยเกินไป กรุณารอสักครู่'
  if (status >= 500 && status <= 599) return 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง'
  return null
}

/**
 * Returns a persistent chat session ID stored in localStorage.
 * Incognito windows get their own localStorage, so history stays separate.
 * Normal windows share localStorage — same user sees their own history consistently.
 */
function getChatSessionId(): string {
  const KEY = 'chat_session_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

async function ensureFingerprint(): Promise<void> {
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
    // Silently fail — will retry on 401 from the chat endpoint
  }
}

/**
 * Single POST /api/chat call. Shared between the first attempt and the
 * post-401 retry so they can't drift apart.
 */
function postChat(message: string): Promise<Response> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-chat-session': getChatSessionId(),
    },
    body: JSON.stringify({ message }),
  })
}

/**
 * Full-page chat interface using HeroUI components.
 */
export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Mirror isLoading into a ref so `sendMessage` can check it without needing
  // to be recreated whenever isLoading changes.
  const isLoadingRef = useRef(false)
  isLoadingRef.current = isLoading

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Bootstrap on mount: focus input, establish fingerprint cookie, then load
  // history. Fingerprint must complete before loadHistory so the first GET
  // doesn't silently fail with 401 on a fresh visitor.
  useEffect(() => {
    inputRef.current?.focus()

    let cancelled = false
    ;(async () => {
      await ensureFingerprint()
      try {
        const response = await fetch('/api/chat', {
          headers: { 'x-chat-session': getChatSessionId() },
        })
        if (!cancelled && response.ok) {
          const data = await response.json()
          if (Array.isArray(data.messages)) {
            setMessages(data.messages)
          }
        }
      } catch {
        // Silent fail — start with empty state
      } finally {
        if (!cancelled) setIsHistoryLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoadingRef.current) return

    const userMessage: ChatMessageData = {
      role: 'user',
      content: messageText.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      let response = await postChat(userMessage.content)

      // If the fingerprint cookie expired, refresh and retry once.
      if (response.status === 401) {
        await ensureFingerprint()
        response = await postChat(userMessage.content)
      }

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status)
        setError(errorMsg ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง')
        return
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Empty-state is only shown once history has loaded — otherwise returning
  // users see a flash of the empty prompt before their previous messages render.
  const showEmptyState = isHistoryLoaded && messages.length === 0 && !isLoading

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" data-testid="chat-interface">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto" aria-live="polite">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-foreground-500 text-sm max-w-xs">
                สวัสดีครับ! ถามอะไรเกี่ยวกับประสบการณ์หรือทักษะของผมได้เลย
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ChatMessage message={msg} />
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-default-100 rounded-lg px-3 py-2">
                <span className="text-sm text-foreground-500 animate-pulse">
                  กำลังพิมพ์...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center mb-3">
              <span className="text-xs text-danger">{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area — sticky bottom */}
      <div className="sticky bottom-0 border-t border-divider bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ..."
            disabled={isLoading}
            className="flex-1 border border-secondary/30 focus:border-primary/50"
            variant="secondary"
            fullWidth
            data-testid="chat-input"
            aria-label="Chat message input"
          />
          <Button
            variant="primary"
            onPress={() => sendMessage(input)}
            isDisabled={isLoading || !input.trim()}
            size="lg"
            data-testid="chat-send"
          >
            ส่ง
          </Button>
        </div>
      </div>
    </div>
  )
}
