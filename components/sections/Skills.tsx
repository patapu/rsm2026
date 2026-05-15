"use client";

import { Chip, ProgressBar } from "@heroui/react";
import { ME } from "@/lib/me";
import type { Skill } from "@/lib/me";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";

const categoryLabels: Record<string, string> = {
  languages: "Languages",
  frameworks: "Frameworks",
  databases: "Databases",
  devops: "DevOps",
  tools: "Tools",
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
  const { skills } = ME;

  const categories = Object.entries(categoryLabels).map(([key, label]) => ({
    key,
    label,
    items: skills[key as keyof typeof skills] as Skill[],
  }));

  return (
    <AnimatedSection id="skills" title="Skills">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map(({ key, label, items }) => (
          <SubCard key={key}>
            <h3 className="text-lg font-semibold text-primary mb-4">{label}</h3>
            {items.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </SubCard>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-primary mb-4">Soft Skills</h3>
        <div className="flex flex-wrap gap-3">
          {skills.softSkills.map((skill) => (
            <Chip key={skill} variant="soft" size="sm">
              {skill}
            </Chip>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
