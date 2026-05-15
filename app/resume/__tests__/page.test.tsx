// @vitest-environment jsdom

/**
 * Unit tests for Resume Page section ordering
 * Validates: Requirements 4.2
 */
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock framer-motion: motion.section → plain <section>, motion.div → plain <div>
vi.mock("framer-motion", () => ({
  motion: {
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// Mock next/dynamic — RightSidebar is ssr:false and we skip rendering it
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

// Mock @heroui/react components. Factories must be self-contained because
// vi.mock is hoisted above any top-level constants.
vi.mock("@heroui/react", () => {
  type Div = React.HTMLAttributes<HTMLDivElement>;
  type Btn = React.ButtonHTMLAttributes<HTMLButtonElement>;
  type Anchor = React.AnchorHTMLAttributes<HTMLAnchorElement>;
  type Img = React.ImgHTMLAttributes<HTMLImageElement>;

  const Avatar = Object.assign(
    ({ children, ...props }: Div) => <span {...props}>{children}</span>,
    {
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      Image: (props: Img) => <img {...props} />,
      Fallback: ({ children, ...props }: Div) => (
        <span {...props}>{children}</span>
      ),
    },
  );

  const ProgressBar = Object.assign(
    ({ children, ...props }: Div) => <div {...props}>{children}</div>,
    {
      Output: (props: Div) => <span {...props} />,
      Track: ({ children, ...props }: Div) => <div {...props}>{children}</div>,
      Fill: (props: Div) => <div {...props} />,
    },
  );

  return {
    Card: ({ children, ...props }: Div) => (
      <div data-testid="card" {...props}>{children}</div>
    ),
    CardContent: ({ children, ...props }: Div) => (
      <div data-testid="card-content" {...props}>{children}</div>
    ),
    Separator: (props: React.HTMLAttributes<HTMLHRElement>) => <hr {...props} />,
    Avatar,
    Chip: ({ children, ...props }: Div) => <span {...props}>{children}</span>,
    Button: ({ children, ...props }: Btn) => (
      <button {...props}>{children}</button>
    ),
    Link: ({ children, ...props }: Anchor) => <a {...props}>{children}</a>,
    ProgressBar,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
  };
});

import ResumePage from "../page";

describe("Resume Page - Section Ordering", () => {
  it("renders sections in correct DOM order: Hero → Summary → Skills → Experience → Projects → Education → Hobbies", () => {
    const { container } = render(<ResumePage />);

    const expectedOrder = [
      "hero",
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "hobbies",
    ];

    const sections = container.querySelectorAll("section[id]");
    const sectionIds = Array.from(sections).map((el) => el.id);

    expect(sectionIds).toHaveLength(expectedOrder.length);

    expectedOrder.forEach((id, index) => {
      expect(sectionIds[index]).toBe(id);
    });
  });
});
