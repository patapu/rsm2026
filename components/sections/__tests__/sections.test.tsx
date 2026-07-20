/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for Resume Section Components
 * Requirements: 1.1, 2.1, 5.1, 8.1
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithLocale } from "@/test-utils/renderWithLocale";

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
import { ME, ME_EN } from "@/lib/me";

describe("Hero Section", () => {
  it("shows name (English, the site default) correctly", () => {
    render(<Hero />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Pakorn");
    expect(heading.textContent).toContain("Chaowanaprasert");
  });

  it("shows nickname (English, the site default)", () => {
    render(<Hero />);
    // Nickname appears both in Avatar.Fallback and in the heading -> use getAllByText
    const matches = screen.getAllByText(/Kur/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows title 'Lead Developer'", () => {
    render(<Hero />);
    expect(screen.getByText("Lead Developer")).toBeTruthy();
  });

  it("shows tagline", () => {
    render(<Hero />);
    expect(
      screen.getByText(ME_EN.profile.tagline)
    ).toBeTruthy();
  });

  it("renders the romanized/English name on locale 'en'", () => {
    renderWithLocale(<Hero />, "en");
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Pakorn");
    expect(heading.textContent).toContain("Chaowanaprasert");
  });

  it("renders the Thai-script name on locale 'th'", () => {
    renderWithLocale(<Hero />, "th");
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("ปกร");
    expect(heading.textContent).toContain("เชาวนประเสริฐ");
  });

  describe("PDF download buttons", () => {
    it("point at two different files regardless of active locale", () => {
      renderWithLocale(<Hero />, "en");
      const thLink = screen.getByText("Resume (TH)").closest("a");
      const enLink = screen.getByText("Resume (EN)").closest("a");

      expect(thLink).toBeTruthy();
      expect(enLink).toBeTruthy();
      expect(thLink!.getAttribute("href")).not.toBe(enLink!.getAttribute("href"));
    });

    it("each label matches its actual (genuinely TH / genuinely EN) file", () => {
      renderWithLocale(<Hero />, "en");
      const thLink = screen.getByText("Resume (TH)").closest("a");
      const enLink = screen.getByText("Resume (EN)").closest("a");

      expect(thLink!.getAttribute("href")).toBe(ME.cta.resumePdfUrl);
      expect(enLink!.getAttribute("href")).toBe(ME.cta.resumePdfUrlEn);
    });

    it("stay pointed at the same TH/EN files when locale is 'th'", () => {
      renderWithLocale(<Hero />, "th");
      const thLink = screen.getByText("Resume (TH)").closest("a");
      const enLink = screen.getByText("Resume (EN)").closest("a");

      expect(thLink!.getAttribute("href")).toBe(ME.cta.resumePdfUrl);
      expect(enLink!.getAttribute("href")).toBe(ME.cta.resumePdfUrlEn);
      expect(thLink!.getAttribute("href")).not.toBe(enLink!.getAttribute("href"));
    });
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

  it("shows every soft skill from ME_EN (site default locale is English)", () => {
    render(<Skills />);
    for (const skill of ME_EN.skills.softSkills) {
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
