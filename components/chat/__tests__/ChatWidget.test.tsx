/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for ChatWidget
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.7
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock react-markdown to avoid ESM issues in test environment
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}))

import ChatWidget from '../ChatWidget'

// Mock fetch globally
const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = mockFetch

  // Default: fingerprint call succeeds
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  })
})

describe('ChatWidget', () => {
  it('renders a floating button', () => {
    render(<ChatWidget />)
    const button = screen.getByTestId('chat-toggle')
    expect(button).toBeTruthy()
    // Should be a round button (check for rounded-full class)
    expect(button.className).toContain('rounded-full')
  })

  it('opens the panel when clicking the floating button', async () => {
    render(<ChatWidget />)

    // Panel should not be visible initially
    expect(screen.queryByTestId('chat-panel')).toBeNull()

    // Click the toggle button
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-toggle'))
    })

    // Panel should now be visible
    expect(screen.getByTestId('chat-panel')).toBeTruthy()
  })

  it('closes the panel when clicking the floating button again', async () => {
    render(<ChatWidget />)

    // Open panel
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-toggle'))
    })
    expect(screen.getByTestId('chat-panel')).toBeTruthy()

    // Close panel
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-toggle'))
    })
    expect(screen.queryByTestId('chat-panel')).toBeNull()
  })

  it('sends a message with Enter key', async () => {
    // Mock chat API response
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ reply: 'สวัสดีครับ' }),
        })
      }
      // fingerprint
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    })

    render(<ChatWidget />)

    // Open panel
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-toggle'))
    })

    const input = screen.getByTestId('chat-input')

    // Type a message
    await act(async () => {
      fireEvent.change(input, { target: { value: 'สวัสดี' } })
    })

    // Press Enter
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    })

    // Wait for the user message to appear
    await waitFor(() => {
      expect(screen.getByText('สวัสดี')).toBeTruthy()
    })

    // Verify chat API was called
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: 'สวัสดี' }),
    }))
  })

  it('displays AI messages on the left and user messages on the right', async () => {
    // Mock chat API response
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ reply: 'ผมเป็น Lead Developer ครับ' }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    })

    render(<ChatWidget />)

    // Open panel
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-toggle'))
    })

    const input = screen.getByTestId('chat-input')

    // Send a message
    await act(async () => {
      fireEvent.change(input, { target: { value: 'คุณทำอะไร' } })
    })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    })

    // Wait for AI reply
    await waitFor(() => {
      expect(screen.getByText('ผมเป็น Lead Developer ครับ')).toBeTruthy()
    })

    // Check user message is on the right (justify-end)
    const userMessage = screen.getByTestId('message-user')
    expect(userMessage.className).toContain('justify-end')

    // Check AI message is on the left (justify-start)
    const aiMessage = screen.getByTestId('message-assistant')
    expect(aiMessage.className).toContain('justify-start')
  })
})
