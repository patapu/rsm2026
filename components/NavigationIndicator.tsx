"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "hero", label: "Hero" },
  { id: "summary", label: "สรุป" },
  { id: "skills", label: "ทักษะ" },
  { id: "experience", label: "ประสบการณ์" },
  { id: "projects", label: "โปรเจกต์" },
  { id: "education", label: "การศึกษา" },
  { id: "contact", label: "ติดต่อ" },
];

export default function NavigationIndicator() {
  const [activeSection, setActiveSection] = useState<string>("hero");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0,
    });

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) {
        observer.observe(el);
      }
    }

    observers.push(observer);

    return () => {
      for (const obs of observers) {
        obs.disconnect();
      }
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="Section navigation"
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3"
    >
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          aria-label={`ไปยัง ${section.label}`}
          aria-current={activeSection === section.id ? "true" : undefined}
          className="group relative flex items-center"
        >
          {/* Tooltip */}
          <span className="absolute right-6 px-2 py-1 rounded bg-surface border border-border text-xs text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {section.label}
          </span>
          {/* Dot */}
          <span
            className={`block rounded-full transition-all duration-300 ${
              activeSection === section.id
                ? "w-3 h-3 bg-accent shadow-[0_0_6px_rgba(79,195,247,0.5)]"
                : "w-2 h-2 bg-muted hover:bg-text"
            }`}
          />
        </button>
      ))}
    </nav>
  );
}
