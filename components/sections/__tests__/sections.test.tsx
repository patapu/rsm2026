/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for Resume Section Components
 * Requirements: 1.1, 2.1, 5.1, 8.1
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/image to render a plain img tag
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import Hero from "../Hero";
import Skills from "../Skills";
import Experience from "../Experience";
import Contact from "../Contact";
import { ME } from "@/lib/me";

describe("Hero Section", () => {
  it("shows name (Thai) correctly", () => {
    render(<Hero />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("ปกร");
    expect(heading.textContent).toContain("เชาวนประเสริฐ");
  });

  it("shows nickname (Thai)", () => {
    render(<Hero />);
    expect(screen.getByText(/เกื้อ/)).toBeTruthy();
  });

  it("shows title 'Lead Developer'", () => {
    render(<Hero />);
    expect(screen.getByText("Lead Developer")).toBeTruthy();
  });

  it("shows tagline", () => {
    render(<Hero />);
    expect(
      screen.getByText("Coding is not just a skill, but my passion.")
    ).toBeTruthy();
  });
});

describe("Skills Section", () => {
  it("shows every language skill from ME", () => {
    render(<Skills />);
    for (const skill of ME.skills.languages) {
      expect(screen.getByText(skill.name)).toBeTruthy();
    }
  });

  it("shows every framework skill from ME", () => {
    render(<Skills />);
    for (const skill of ME.skills.frameworks) {
      expect(screen.getByText(skill.name)).toBeTruthy();
    }
  });

  it("shows every database skill from ME", () => {
    render(<Skills />);
    for (const skill of ME.skills.databases) {
      expect(screen.getByText(skill.name)).toBeTruthy();
    }
  });

  it("shows every devops skill from ME", () => {
    render(<Skills />);
    for (const skill of ME.skills.devops) {
      expect(screen.getByText(skill.name)).toBeTruthy();
    }
  });

  it("shows every tools skill from ME", () => {
    render(<Skills />);
    for (const skill of ME.skills.tools) {
      expect(screen.getByText(skill.name)).toBeTruthy();
    }
  });

  it("shows every soft skill from ME", () => {
    render(<Skills />);
    for (const skill of ME.skills.softSkills) {
      expect(screen.getByText(skill)).toBeTruthy();
    }
  });
});

describe("Experience Section", () => {
  it("shows both companies", () => {
    render(<Experience />);
    expect(screen.getByText("MSC")).toBeTruthy();
    expect(screen.getByText("CDG")).toBeTruthy();
  });

  it("shows MSC before CDG (newest first)", () => {
    render(<Experience />);
    const msc = screen.getByText("MSC");
    const cdg = screen.getByText("CDG");
    // MSC should appear before CDG in the DOM
    expect(
      msc.compareDocumentPosition(cdg) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe("Contact Section", () => {
  it("shows email as mailto link", () => {
    render(<Contact />);
    const emailLink = screen.getByRole("link", {
      name: ME.contact.email,
    });
    expect(emailLink).toBeTruthy();
    expect(emailLink.getAttribute("href")).toBe(`mailto:${ME.contact.email}`);
  });

  it("shows phone as tel link", () => {
    render(<Contact />);
    const phoneLink = screen.getByRole("link", {
      name: ME.contact.phone,
    });
    expect(phoneLink).toBeTruthy();
    expect(phoneLink.getAttribute("href")).toBe(`tel:${ME.contact.phone}`);
  });
});
