// @vitest-environment jsdom

/**
 * Unit tests for Contact Page
 * Validates: Requirements 6.2, 6.3, 6.4, 6.5
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock framer-motion: motion.div → plain <div>
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock @heroui/react components
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
}));

import ContactPage from "../page";

describe("Contact Page", () => {
  it("renders email link with correct mailto href", () => {
    render(<ContactPage />);

    const emailLink = screen.getByTestId("contact-email");
    expect(emailLink).toBeDefined();
    expect(emailLink.getAttribute("href")).toBe("mailto:patapuputapa@gmail.com");
  });

  it("renders phone link with correct tel href", () => {
    render(<ContactPage />);

    const phoneLink = screen.getByTestId("contact-phone");
    expect(phoneLink).toBeDefined();
    expect(phoneLink.getAttribute("href")).toBe("tel:0885797989");
  });

  it("shows 'available for hire' message when ME.cta.availableForHire is true", () => {
    render(<ContactPage />);

    const availableEl = screen.getByTestId("available-for-hire");
    expect(availableEl).toBeDefined();
  });

  it("shows PDF download button when ME.cta.resumePdfUrl is set", () => {
    render(<ContactPage />);

    const pdfEl = screen.getByTestId("pdf-download");
    expect(pdfEl).toBeDefined();

    const downloadLink = pdfEl.querySelector("a");
    expect(downloadLink).not.toBeNull();
    expect(downloadLink!.getAttribute("href")).toBe("/resume-pakorn.pdf");
    expect(downloadLink!.hasAttribute("download")).toBe(true);
  });
});
