"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import AnimatedSection from "@/components/ui/AnimatedSection";

export default function Summary() {
  const { me, t } = useLocale();
  const { summary } = me;

  return (
    <AnimatedSection id="summary" title={t("sections.summary")}>
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-[#FF00FF] text-5xl font-mono font-bold neon-text-magenta">
          {summary.yearsOfExperience}
        </span>
        <span className="text-foreground-500 text-lg">{t("summary.yearsOfExperience")}</span>
      </div>

      <p className="text-foreground leading-relaxed mb-8">{summary.bio}</p>

      <ul className="space-y-3">
        {summary.highlights.map((highlight, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-[#00FFFF] font-mono mt-1">{">"}</span>
            <span className="text-foreground">{highlight}</span>
          </li>
        ))}
      </ul>
    </AnimatedSection>
  );
}
