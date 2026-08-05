/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for ChatInterface
 * Requirements: 3.5, 3.7, 3.9, 3.10, 3.12
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @heroui/react components
vi.mock('@heroui/react', () => ({
  Input: ({ value, onChange, onKeyDown, placeholder, disabled, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      data-testid={props['data-testid']}
      aria-label={props['aria-label']}
    />
  ),
  Button: ({ children, onPress, isDisabled, ...props }: any) => (
    <button
      onClick={onPress}
      disabled={isDisabled}
      data-testid={props['data-testid']}
    >
      {children}
    </button>
  ),
}))

// Mock framer-motion. Strip framer-only props so they aren't forwarded onto
// the DOM node, and provide AnimatePresence + the motion elements used by
// ChatInterface (div wrapper + span loading dots).
vi.mock('framer-motion', () => {
  const passthrough = ({ children, initial, animate, exit, transition, ...rest }: any) => (
    <div {...rest}>{children}</div>
  )
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: {
      div: passthrough,
      span: passthrough,
    },
  }
})

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}))

// Mock ChatMessage to simplify rendering
vi.mock('../ChatMessage', () => ({
  default: ({ message }: any) => (
    <div data-testid={`message-${message.role}`}>{message.content}</div>
  ),
}))

import ChatInterface from '../ChatInterface'

// Mock fetch globally
const mockFetch = vi.fn()

// Mock navigator and screen for fingerprint
const mockNavigator = {
  userAgent: 'test-agent',
  language: 'th',
}

const mockScreen = {
  width: 1920,
  height: 1080,
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = mockFetch

  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
  })
  Object.defineProperty(global, 'screen', {
    value: mockScreen,
    writable: true,
  })

  // Default: all fetch calls succeed with empty responses
  mockFetch.mockImplementation((url: string, options?: any) => {
    if (url === '/api/auth/fingerprint') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    }
    if (url === '/api/chat' && (!options || options.method !== 'POST')) {
      // GET history - return empty
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] }),
      })
    }
    // POST chat
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'test reply' }),
    })
  })
})

describe('ChatInterface', () => {
  it('renders welcome message when no messages (site default locale is English)', async () => {
    await act(async () => {
      render(<ChatInterface />)
    })

    expect(
      screen.getByText('Hi! Ask me anything about my experience or skills.')
    ).toBeTruthy()
  })

  it('send button triggers API call with correct body', async () => {
    await act(async () => {
      render(<ChatInterface />)
    })

    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('chat-send')

    // Type a message
    await act(async () => {
      fireEvent.change(input, { target: { value: 'สวัสดี' } })
    })

    // Click send
    await act(async () => {
      fireEvent.click(sendButton)
    })

    // Verify POST /api/chat was called with correct body
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'สวัสดี', locale: 'en' }),
        }),
      )
    })
  })

  it('shows loading indicator "Typing" during request (site default locale is English)', async () => {
    // Make the POST /api/chat hang so we can observe loading state
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ messages: [] }),
        })
      }
      // POST chat - never resolves to keep loading state
      return new Promise(() => {})
    })

    await act(async () => {
      render(<ChatInterface />)
    })

    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('chat-send')

    // Type and send
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test message' } })
    })
    await act(async () => {
      fireEvent.click(sendButton)
    })

    // Loading indicator should appear (animated dots labelled "Typing")
    expect(screen.getByRole('status', { name: 'Typing' })).toBeTruthy()
  })

  it('displays error message on 429 response', async () => {
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ messages: [] }),
        })
      }
      // POST chat - return 429
      return Promise.resolve({
        ok: false,
        status: 429,
        json: async () => ({}),
      })
    })

    await act(async () => {
      render(<ChatInterface />)
    })

    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('chat-send')

    // Type and send
    await act(async () => {
      fireEvent.change(input, { target: { value: 'hello' } })
    })
    await act(async () => {
      fireEvent.click(sendButton)
    })

    // Error message should appear (site default locale is English)
    await waitFor(() => {
      expect(
        screen.getByText("You're sending messages too quickly. Please wait a moment.")
      ).toBeTruthy()
    })
  })

  it('renders a streamed SSE reply incrementally and keeps the assembled text', async () => {
    const encoder = new TextEncoder()
    const frames = [
      ': open\n\n',
      'event: chunk\ndata: {"text":"สวัสดี"}\n\n',
      'event: chunk\ndata: {"text":"ครับ"}\n\n',
      'event: done\ndata: {"text":"สวัสดีครับ"}\n\n',
    ]

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ messages: [] }) })
      }
      // POST chat — answer with a real SSE body.
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        body: new ReadableStream({
          start(controller) {
            for (const frame of frames) controller.enqueue(encoder.encode(frame))
            controller.close()
          },
        }),
      })
    })

    await act(async () => {
      render(<ChatInterface />)
    })

    await act(async () => {
      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'สวัสดี' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('message-assistant').textContent).toBe('สวัสดีครับ')
    })

    // The request opted into streaming.
    const postCall = mockFetch.mock.calls.find(
      ([url, opts]: any[]) => url === '/api/chat' && opts?.method === 'POST',
    )
    expect(postCall?.[1].headers.Accept).toBe('text/event-stream')
  })

  it('shows live agent status from tool events, then clears it when text starts', async () => {
    const encoder = new TextEncoder()
    // Held open so the status can be observed before any text arrives.
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ messages: [] }) })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        body: new ReadableStream({
          start(controller) {
            controllerRef = controller
            controller.enqueue(
              encoder.encode(
                'event: tool\ndata: {"tool":"searchResume","phase":"start","id":"c1"}\n\n',
              ),
            )
          },
        }),
      })
    })

    await act(async () => {
      render(<ChatInterface />)
    })
    await act(async () => {
      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'ประสบการณ์' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })

    // Site default locale is English.
    await waitFor(() => {
      expect(screen.getByTestId('agent-status').textContent).toBe('Searching my resume...')
    })
    // The status also becomes the accessible name, replacing "Typing".
    expect(screen.getByRole('status', { name: 'Searching my resume...' })).toBeTruthy()

    // Tool finished, reply not composed yet.
    await act(async () => {
      controllerRef!.enqueue(
        encoder.encode('event: tool\ndata: {"tool":"searchResume","phase":"end","id":"c1"}\n\n'),
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('agent-status').textContent).toBe('Putting the answer together...')
    })

    // First text delta replaces the whole status block with the reply.
    await act(async () => {
      controllerRef!.enqueue(encoder.encode('event: chunk\ndata: {"text":"สวัสดี"}\n\n'))
      controllerRef!.enqueue(encoder.encode('event: done\ndata: {"text":"สวัสดี"}\n\n'))
      controllerRef!.close()
    })

    await waitFor(() => {
      expect(screen.getByTestId('message-assistant').textContent).toBe('สวัสดี')
    })
    expect(screen.queryByTestId('agent-status')).toBeNull()
  })

  it('falls back to the generic status for an unrecognised tool name', async () => {
    const encoder = new TextEncoder()

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ messages: [] }) })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        body: new ReadableStream({
          start(controller) {
            // A tool this client release has never heard of.
            controller.enqueue(
              encoder.encode('event: tool\ndata: {"tool":"searchGithub","phase":"start"}\n\n'),
            )
          },
        }),
      })
    })

    await act(async () => {
      render(<ChatInterface />)
    })
    await act(async () => {
      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'hello' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-status').textContent).toBe('Working on it...')
    })
  })

  it('keeps the plain typing dots when the stream emits no tool event', async () => {
    const encoder = new TextEncoder()

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ messages: [] }) })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        // Opened and never written to: the pre-tool-event state.
        body: new ReadableStream({ start() {} }),
      })
    })

    await act(async () => {
      render(<ChatInterface />)
    })
    await act(async () => {
      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'hello' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })

    expect(screen.getByRole('status', { name: 'Typing' })).toBeTruthy()
    expect(screen.queryByTestId('agent-status')).toBeNull()
  })

  it('falls back to the JSON reply when the response is not a stream', async () => {
    // Default mockFetch returns { reply: 'test reply' } with no body/headers —
    // i.e. exactly what a non-streaming server (or a buffering proxy) produces.
    await act(async () => {
      render(<ChatInterface />)
    })

    await act(async () => {
      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'hello' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('message-assistant').textContent).toBe('test reply')
    })
  })

  it('shows an error when the stream reports a mid-stream failure', async () => {
    const encoder = new TextEncoder()

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/auth/fingerprint') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (url === '/api/chat' && (!options || options.method !== 'POST')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ messages: [] }) })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: error\ndata: {"error":"Service unavailable"}\n\n'))
            controller.close()
          },
        }),
      })
    })

    await act(async () => {
      render(<ChatInterface />)
    })

    await act(async () => {
      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'hello' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeTruthy()
    })
  })

  it('calls scrollIntoView on new message', async () => {
    const scrollIntoViewMock = vi.fn()

    // Mock Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoViewMock

    await act(async () => {
      render(<ChatInterface />)
    })

    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('chat-send')

    // Reset mock after initial renders (history load may trigger scroll)
    scrollIntoViewMock.mockClear()

    // Type and send
    await act(async () => {
      fireEvent.change(input, { target: { value: 'trigger scroll' } })
    })
    await act(async () => {
      fireEvent.click(sendButton)
    })

    // Wait for the message to appear and scroll to be triggered
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
    })
  })
})
