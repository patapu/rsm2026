// @vitest-environment jsdom

/**
 * Unit tests for locale-aware behavior of the Contact page:
 *  - English locale uses `cta.resumePdfUrlEn` when present
 *  - English locale falls back to `cta.resumePdfUrl` when `resumePdfUrlEn` is absent
 */
import { screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { renderWithLocale } from "@/test-utils/renderWithLocale"

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock("@heroui/react", () => ({
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

const mockContact = { email: "test@example.com", phone: "0000000000", linkedin: "", website: "" }

// Mutable per-test cta fixtures so each `it` can control resumePdfUrlEn
// independently for the 'en' dataset without affecting the 'th' one.
const mockCtaTh = {
  message: "",
  resumePdfUrl: "/resume-pakorn.pdf",
  qrCodeImage: "",
  availableForHire: false,
  preferredContact: "email",
}

const mockCtaEn: { resumePdfUrl: string; resumePdfUrlEn?: string; [k: string]: unknown } = {
  message: "",
  resumePdfUrl: "/resume-pakorn.pdf",
  resumePdfUrlEn: "/resume-pakorn-en.pdf",
  qrCodeImage: "",
  availableForHire: false,
  preferredContact: "email",
}

vi.mock("@/lib/me", () => ({
  get ME() {
    return { contact: mockContact, cta: mockCtaTh }
  },
  get ME_EN() {
    return { contact: mockContact, cta: mockCtaEn }
  },
  getAvailableMessage: () => "mock-available-message",
}))

import ContactPage from "../page"

describe("Contact page — locale-aware resume PDF link", () => {
  it("uses cta.resumePdfUrlEn when locale is 'en' and it is set", () => {
    mockCtaEn.resumePdfUrlEn = "/resume-pakorn-en.pdf"

    renderWithLocale(<ContactPage />, "en")

    const pdfEl = screen.getByTestId("pdf-download")
    const link = pdfEl.querySelector("a")
    expect(link).not.toBeNull()
    expect(link!.getAttribute("href")).toBe("/resume-pakorn-en.pdf")
  })

  it("falls back to cta.resumePdfUrl when locale is 'en' and resumePdfUrlEn is not set", () => {
    delete mockCtaEn.resumePdfUrlEn

    renderWithLocale(<ContactPage />, "en")

    const pdfEl = screen.getByTestId("pdf-download")
    const link = pdfEl.querySelector("a")
    expect(link).not.toBeNull()
    expect(link!.getAttribute("href")).toBe("/resume-pakorn.pdf")
  })

  it("falls back to cta.resumePdfUrl when locale is 'en' and resumePdfUrlEn is an empty string", () => {
    mockCtaEn.resumePdfUrlEn = ""

    renderWithLocale(<ContactPage />, "en")

    const pdfEl = screen.getByTestId("pdf-download")
    const link = pdfEl.querySelector("a")
    expect(link!.getAttribute("href")).toBe("/resume-pakorn.pdf")
  })

  it("uses cta.resumePdfUrl (th) when locale is 'th', regardless of resumePdfUrlEn", () => {
    mockCtaEn.resumePdfUrlEn = "/resume-pakorn-en.pdf"

    renderWithLocale(<ContactPage />, "th")

    const pdfEl = screen.getByTestId("pdf-download")
    const link = pdfEl.querySelector("a")
    expect(link!.getAttribute("href")).toBe("/resume-pakorn.pdf")
  })
})
