'use client'

import { Input, Button } from '@heroui/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatMessage, { type ChatMessageData } from './ChatMessage'
import { readSSE, isToolStatus } from './sse'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { DEFAULT_LOCALE, translate, type Locale, type MessageKey } from '@/lib/i18n'

/**
 * Status text shown while a given tool runs. Keyed by the tool name the server
 * sends, so a tool added server-side degrades to the generic status instead of
 * breaking an older client.
 */
const TOOL_STATUS_KEYS: Record<string, MessageKey> = {
  searchResume: 'chat.statusSearchingResume',
}

/**
 * Minimum gap between re-renders while a reply streams in. Model deltas can
 * land faster than Markdown can be re-parsed; coalescing them keeps the reveal
 * smooth without noticeably lagging behind the text.
 */
const STREAM_FLUSH_MS = 50

/**
 * Maps an HTTP error status code to a user-facing error message.
 * Returns null if the status code does not map to a known error.
 * `locale` defaults to `'th'` so existing callers are unaffected.
 */
export function getErrorMessage(status: number, locale: Locale = DEFAULT_LOCALE): string | null {
  if (status === 429) return translate(locale, 'chat.errorRateLimit')
  if (status >= 500 && status <= 599) return translate(locale, 'chat.errorGeneric')
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
 *
 * `Accept: text/event-stream` opts into the streaming reply. The route falls
 * back to its original JSON response when the header is absent, and the caller
 * falls back to reading JSON when the response is not actually a stream — so a
 * buffering proxy degrades to the old behaviour instead of breaking.
 */
function postChat(message: string, locale: Locale, signal?: AbortSignal): Promise<Response> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-chat-session': getChatSessionId(),
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message, locale }),
    signal,
  })
}

/**
 * Full-page chat interface using HeroUI components.
 */
export default function ChatInterface() {
  const { locale, t } = useLocale()
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Indices of assistant messages that have already finished typewriter reveal
  // (or were loaded from history and should render instantly).
  const [typedIndices, setTypedIndices] = useState<Set<number>>(new Set())
  // Index of the assistant message whose text is still arriving over SSE.
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null)
  // What the agent is doing right now, while nothing is renderable yet. Null
  // until a `tool` frame arrives, so a stream that never calls a tool (and the
  // JSON fallback) keeps the plain typing dots.
  const [toolStatus, setToolStatus] = useState<MessageKey | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Aborts the in-flight request on unmount (and gives a future Stop button
  // something to call) so the stream reader can't outlive the component.
  const abortRef = useRef<AbortController | null>(null)

  // "Busy" spans the whole turn: waiting for the first byte AND streaming the
  // reply. A second send during either would clobber the message being written.
  const isBusy = isLoading || streamingIndex !== null
  // Mirror it into a ref so `sendMessage` can check it without needing to be
  // recreated whenever the busy state changes.
  const isBusyRef = useRef(false)
  isBusyRef.current = isBusy

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
            // History messages render instantly — no typewriter for past replies.
            setTypedIndices(new Set(data.messages.map((_: unknown, i: number) => i)))
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

  // Tear down any in-flight stream when the component goes away, so its reader
  // (and the setState calls behind it) can't outlive the mount.
  useEffect(() => () => abortRef.current?.abort(), [])

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isBusyRef.current) return

    const userMessage: ChatMessageData = {
      role: 'user',
      content: messageText.trim(),
    }

    setMessages((prev) => {
      // User messages are not typewritten, but mark their index as "typed" so
      // the index-tracking stays aligned with the messages array.
      setTypedIndices((ti) => new Set(ti).add(prev.length))
      return [...prev, userMessage]
    })
    setInput('')
    setError(null)
    setIsLoading(true)
    setToolStatus(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let response = await postChat(userMessage.content, locale, controller.signal)

      // If the fingerprint cookie expired, refresh and retry once.
      if (response.status === 401) {
        await ensureFingerprint()
        response = await postChat(userMessage.content, locale, controller.signal)
      }

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status, locale)
        setError(errorMsg ?? t('chat.errorGeneric'))
        return
      }

      const contentType = response.headers?.get?.('content-type') ?? ''
      if (!response.body || !contentType.includes('text/event-stream')) {
        // Not a stream — the original JSON contract. Reached when the server
        // declines to stream, or a proxy buffered the response into one blob.
        // The reply is NOT marked as typed, so GlitchReveal still plays.
        const data = await response.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
        return
      }

      // ── Streaming reply ──────────────────────────────────────────────
      // The assistant bubble is only created once the FIRST delta lands, so the
      // typing dots stay up during the tool round-trip instead of an empty
      // bubble appearing immediately.
      let text = ''
      let started = false
      let lastFlush = 0
      let failed = false

      const flush = () => {
        const content = text
        if (!started) {
          started = true
          setIsLoading(false)
          // Real text has arrived: the status line has done its job.
          setToolStatus(null)
          setMessages((prev) => {
            const index = prev.length
            // The stream itself is the reveal — mark the index typed so
            // GlitchReveal never re-plays it once the stream finishes.
            setTypedIndices((ti) => new Set(ti).add(index))
            setStreamingIndex(index)
            return [...prev, { role: 'assistant', content }]
          })
        } else {
          setMessages((prev) =>
            prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m)),
          )
        }
      }

      for await (const event of readSSE(response.body)) {
        const payload = event.data as { text?: string; error?: string } | undefined

        if (event.event === 'tool') {
          // Progress report from the agent. Ignored once text is flowing: the
          // reply itself is better feedback than a status line.
          if (!started && isToolStatus(event.data)) {
            setToolStatus(
              event.data.phase === 'start'
                ? TOOL_STATUS_KEYS[event.data.tool] ?? 'chat.statusWorking'
                : 'chat.statusComposing',
            )
          }
        } else if (event.event === 'chunk') {
          text += payload?.text ?? ''
          const now = Date.now()
          if (!started || now - lastFlush >= STREAM_FLUSH_MS) {
            lastFlush = now
            flush()
          }
        } else if (event.event === 'done') {
          // The server sends the whole reply again so a dropped delta cannot
          // leave the bubble permanently truncated.
          if (typeof payload?.text === 'string' && payload.text.length >= text.length) {
            text = payload.text
          }
          if (text) flush()
        } else if (event.event === 'error') {
          failed = true
          break
        }
      }

      if (failed || !started) {
        // Nothing usable arrived, or the server reported a mid-stream failure.
        setError(t('chat.errorGeneric'))
      } else {
        // Final flush — the last delta is coalesced away by the throttle if the
        // stream ends without a `done` event (e.g. the server closed early).
        flush()
      }
    } catch (err) {
      // An abort is a deliberate teardown, not a connection failure.
      if ((err as Error)?.name !== 'AbortError') {
        setError(t('chat.errorConnection'))
      }
    } finally {
      abortRef.current = null
      setIsLoading(false)
      setStreamingIndex(null)
      setToolStatus(null)
    }
  }, [locale, t])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Empty-state is only shown once history has loaded — otherwise returning
  // users see a flash of the empty prompt before their previous messages render.
  const showEmptyState = isHistoryLoaded && messages.length === 0 && !isBusy

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" data-testid="chat-interface">
      {/* Messages area. `aria-busy` while a reply is arriving holds back the
          live region until the reply is complete — otherwise a screen reader
          would re-announce the message on every streamed delta. */}
      <div className="flex-1 overflow-y-auto" aria-live="polite" aria-busy={isBusy}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(0,255,255,0.1)] border border-[rgba(0,255,255,0.3)] neon-border-cyan flex items-center justify-center mb-4">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#00FFFF]"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="font-mono uppercase tracking-wider neon-text-cyan text-sm max-w-xs">
                {t('chat.emptyStateGreeting')}
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <ChatMessage
                  message={msg}
                  isStreaming={msg.role === 'assistant' && !typedIndices.has(i)}
                  isPending={i === streamingIndex}
                  onDoneStreaming={() =>
                    setTypedIndices((prev) => {
                      if (prev.has(i)) return prev
                      return new Set(prev).add(i)
                    })
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex justify-start mb-3">
              <div
                className="bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] rounded-lg px-3 py-2"
                // The status text replaces the label when present, otherwise a
                // screen reader would hear "Typing" and never what the agent is
                // actually doing.
                aria-label={toolStatus ? t(toolStatus) : t('chat.typingAriaLabel')}
                role="status"
              >
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF00FF] shadow-[0_0_6px_rgba(255,0,255,0.8)]"
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: d * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                  {toolStatus && (
                    <span
                      data-testid="agent-status"
                      className="ml-1.5 font-mono uppercase tracking-wider text-[11px] text-[#FF00FF]"
                    >
                      {t(toolStatus)}
                    </span>
                  )}
                </div>
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
      <div className="sticky bottom-0 bg-[rgba(5,5,10,0.85)] backdrop-blur-md border-t border-[rgba(0,255,255,0.2)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            disabled={isBusy}
            className="flex-1 border border-[rgba(255,0,255,0.3)] focus:border-[#00FFFF] focus:shadow-[0_0_10px_rgba(0,255,255,0.3)]"
            variant="secondary"
            fullWidth
            data-testid="chat-input"
            aria-label="Chat message input"
          />
          <Button
            variant="primary"
            onPress={() => sendMessage(input)}
            isDisabled={isBusy || !input.trim()}
            size="lg"
            data-testid="chat-send"
          >
            {t('chat.sendButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
