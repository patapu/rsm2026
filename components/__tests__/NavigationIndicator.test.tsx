/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for NavigationIndicator component
 * Requirements: 1.5, 1.6
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  mockObserve.mockClear();
  mockDisconnect.mockClear();
});

import NavigationIndicator from "../NavigationIndicator";

describe("NavigationIndicator", () => {
  beforeEach(() => {
    // Create section elements in the DOM for the observer to find
    const sectionIds = [
      "hero",
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "contact",
    ];
    for (const id of sectionIds) {
      const el = document.createElement("section");
      el.id = id;
      document.body.appendChild(el);
    }
  });

  it("renders navigation with 7 dots (one per section)", () => {
    render(<NavigationIndicator />);
    const nav = screen.getByRole("navigation", { name: /section navigation/i });
    expect(nav).toBeTruthy();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(7);
  });

  it("has aria-labels for each section", () => {
    render(<NavigationIndicator />);
    expect(screen.getByLabelText("ไปยัง Hero")).toBeTruthy();
    expect(screen.getByLabelText("ไปยัง สรุป")).toBeTruthy();
    expect(screen.getByLabelText("ไปยัง ทักษะ")).toBeTruthy();
    expect(screen.getByLabelText("ไปยัง ประสบการณ์")).toBeTruthy();
    expect(screen.getByLabelText("ไปยัง โปรเจกต์")).toBeTruthy();
    expect(screen.getByLabelText("ไปยัง การศึกษา")).toBeTruthy();
    expect(screen.getByLabelText("ไปยัง ติดต่อ")).toBeTruthy();
  });

  it("observes all section elements with IntersectionObserver", () => {
    render(<NavigationIndicator />);
    // Should observe 7 sections
    expect(mockObserve).toHaveBeenCalledTimes(7);
  });

  it("scrolls to section when dot is clicked", () => {
    const mockScrollIntoView = vi.fn();
    const heroEl = document.getElementById("hero")!;
    heroEl.scrollIntoView = mockScrollIntoView;

    render(<NavigationIndicator />);
    const heroButton = screen.getByLabelText("ไปยัง Hero");
    fireEvent.click(heroButton);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("is hidden on mobile (has hidden md:flex classes)", () => {
    render(<NavigationIndicator />);
    const nav = screen.getByRole("navigation", { name: /section navigation/i });
    expect(nav.className).toContain("hidden");
    expect(nav.className).toContain("md:flex");
  });

  it("disconnects observer on unmount", () => {
    const { unmount } = render(<NavigationIndicator />);
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
