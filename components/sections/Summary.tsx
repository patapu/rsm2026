"use client";

import { ME } from "@/lib/me";
import AnimatedSection from "@/components/ui/AnimatedSection";

export default function Summary() {
  const { summary } = ME;

  return (
    <AnimatedSection id="summary" title="Summary">
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-primary text-5xl font-bold">
          {summary.yearsOfExperience}
        </span>
        <span className="text-foreground-500 text-lg">Years of Experience</span>
      </div>

      <p className="text-foreground leading-relaxed mb-8">{summary.bio}</p>

      <ul className="space-y-3">
        {summary.highlights.map((highlight, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-primary mt-1">•</span>
            <span className="text-foreground">{highlight}</span>
          </li>
        ))}
      </ul>
    </AnimatedSection>
  );
}
