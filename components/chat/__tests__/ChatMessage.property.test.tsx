// @vitest-environment jsdom

/**
 * Property-based test: Chat message alignment by role (Property 3)
 * Validates: Requirements 3.6
 *
 * For any ChatMessageData with role 'user' → justify-end class;
 * role 'assistant' → justify-start class.
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock react-markdown to avoid ESM issues in test environment
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}))

import ChatMessage, { type ChatMessageData } from '../ChatMessage'

describe('Feature: heroui-chat-layout, Property 3: Message alignment by role', () => {
  const roleArbitrary = fc.constantFrom<'user' | 'assistant'>('user', 'assistant')
  const contentArbitrary = fc.string({ minLength: 1, maxLength: 200 })

  it('user messages have justify-end class and assistant messages have justify-start class', () => {
    fc.assert(
      fc.property(roleArbitrary, contentArbitrary, (role, content) => {
        const message: ChatMessageData = { role, content }

        const { unmount } = render(<ChatMessage message={message} />)

        const messageEl = screen.getByTestId(`message-${role}`)

        if (role === 'user') {
          expect(messageEl.className).toContain('justify-end')
          expect(messageEl.className).not.toContain('justify-start')
        } else {
          expect(messageEl.className).toContain('justify-start')
          expect(messageEl.className).not.toContain('justify-end')
        }

        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
