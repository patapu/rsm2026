// @vitest-environment jsdom

/**
 * Property-based test: Contact page conditional rendering based on CTA data (Property 10)
 * Validates: Requirements 6.4, 6.5
 *
 * For any boolean `availableForHire` and any string `resumePdfUrl`:
 * - "available for hire" message visible iff `availableForHire === true`
 * - PDF download button visible iff `resumePdfUrl` is non-empty
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock framer-motion: motion.div → plain <div>
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

// Mock @heroui/react components
vi.mock('@heroui/react', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
  Button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

// Mock @/lib/me with a mutable ME object we can control per iteration
const mockME = {
  contact: {
    email: 'test@example.com',
    phone: '0000000000',
    linkedin: '',
    website: '',
  },
  cta: {
    message: '',
    resumePdfUrl: '',
    qrCodeImage: '',
    availableForHire: false,
    preferredContact: 'email',
  },
}

vi.mock('@/lib/me', () => ({
  get ME() {
    return mockME
  },
  getAvailableMessage: () => 'mock-available-message',
}))

import ContactPage from '../page'

describe('Feature: heroui-chat-layout, Property 10: Contact page conditional rendering', () => {
  it('"available for hire" message visible iff availableForHire === true, PDF button visible iff resumePdfUrl is non-empty', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.string({ minLength: 0, maxLength: 100 }),
        (availableForHire, resumePdfUrl) => {
          // Set mock values for this iteration
          mockME.cta.availableForHire = availableForHire
          mockME.cta.resumePdfUrl = resumePdfUrl

          const { unmount } = render(<ContactPage />)

          // Check "available for hire" conditional rendering
          const availableEl = screen.queryByTestId('available-for-hire')
          if (availableForHire) {
            expect(availableEl).not.toBeNull()
          } else {
            expect(availableEl).toBeNull()
          }

          // Check PDF download conditional rendering
          const pdfEl = screen.queryByTestId('pdf-download')
          if (resumePdfUrl.length > 0) {
            expect(pdfEl).not.toBeNull()
          } else {
            expect(pdfEl).toBeNull()
          }

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})
