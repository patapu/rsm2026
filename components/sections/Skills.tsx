"use client";

import { Chip, ProgressBar } from "@heroui/react";
import type { Skill } from "@/lib/me";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

const categoryLabelKeys: Record<string, MessageKey> = {
  languages: "skills.languages",
  frameworks: "skills.frameworks",
  databases: "skills.databases",
  devops: "skills.devops",
  tools: "skills.tools",
};

function SkillBar({ skill }: { skill: Skill }) {
  return (
    <ProgressBar value={skill.level} aria-label={skill.name} className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-foreground text-sm">{skill.name}</span>
        <ProgressBar.Output className="text-foreground-500 text-sm" />
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

export default function Skills() {
  const { me, t } = useLocale();
  const { skills } = me;

  const categories = Object.entries(categoryLabelKeys).map(([key, labelKey]) => ({
    key,
    label: t(labelKey),
    items: skills[key as keyof typeof skills] as Skill[],
  }));

  return (
    <AnimatedSection id="skills" title={t("sections.skills")}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map(({ key, label, items }) => (
          <SubCard key={key}>
            <h3 className="text-base font-mono font-semibold uppercase tracking-wider neon-text-cyan mb-4">{label}</h3>
            {items.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </SubCard>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-base font-mono font-semibold uppercase tracking-wider neon-text-cyan mb-4">{t("skills.softSkills")}</h3>
        <div className="flex flex-wrap gap-3">
          {skills.softSkills.map((skill) => (
            <Chip key={skill} variant="soft" size="sm" className="font-mono bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] text-[#FF00FF]">
              {skill}
            </Chip>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
