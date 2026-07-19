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
  it('renders welcome message when no messages', async () => {
    await act(async () => {
      render(<ChatInterface />)
    })

    expect(
      screen.getByText('สวัสดีครับ! ถามอะไรเกี่ยวกับประสบการณ์หรือทักษะของผมได้เลย')
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
          body: JSON.stringify({ message: 'สวัสดี', locale: 'th' }),
        }),
      )
    })
  })

  it('shows loading indicator "กำลังพิมพ์..." during request', async () => {
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

    // Loading indicator should appear (animated dots labelled "กำลังพิมพ์")
    expect(screen.getByRole('status', { name: 'กำลังพิมพ์' })).toBeTruthy()
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

    // Error message should appear
    await waitFor(() => {
      expect(
        screen.getByText('คุณส่งข้อความบ่อยเกินไป กรุณารอสักครู่')
      ).toBeTruthy()
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
