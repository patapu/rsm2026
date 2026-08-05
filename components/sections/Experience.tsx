"use client";

import { useMemo } from "react";
import { Chip } from "@heroui/react";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { useLocale } from "@/components/i18n/LocaleProvider";

export default function Experience() {
  const { me, t } = useLocale();
  const { experience } = me;

  // Sort newest first (by startDate descending). Memoized so we don't re-sort
  // on every render — the underlying array is stable per render of `me`.
  const sorted = useMemo(
    () => [...experience].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [experience],
  );

  return (
    <AnimatedSection id="experience" title={t("sections.experience")}>
      <div className="space-y-12">
        {sorted.map((exp) => (
          <SubCard key={exp.company}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h3 className="text-2xl font-mono font-bold uppercase tracking-wider text-foreground">{exp.company}</h3>
              <Chip variant="primary" size="sm" className="font-mono">
                {exp.workModel}
              </Chip>
              {exp.teamSize && (
                <Chip variant="primary" size="sm" className="font-mono">
                  👥 Team {exp.teamSize}
                </Chip>
              )}
              <span className="text-foreground-500 text-sm">
                {exp.startDate} - {exp.endDate}
              </span>
            </div>

            <p className="text-foreground mb-4">{exp.summary}</p>

            {/* Career Growth */}
            {exp.roles.length > 1 && (
              <div className="mb-6">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#00FFFF] mb-2">
                  {t("experience.careerGrowth")}
                </h4>
                <div className="space-y-1">
                  {exp.roles.map((role, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-foreground font-medium">{role.title}</span>
                      <span className="text-foreground-500">
                        ({role.startDate} - {role.endDate})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            <div className="mb-6">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#00FFFF] mb-2">
                {t("experience.responsibilities")}
              </h4>
              <ul className="space-y-1">
                {exp.responsibilities.map((item, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-[#00FFFF] font-mono mt-0.5">{">"}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Achievements */}
            <div className="mb-6">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#00FFFF] mb-2">
                {t("experience.achievements")}
              </h4>
              <ul className="space-y-1">
                {exp.achievements.map((ach, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-[#00FFFF] font-mono mt-0.5">{">"}</span>
                    <span>
                      {ach.metric}: <strong>{ach.value}</strong> ({ach.context})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Clients */}
            {exp.clients.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#00FFFF] mb-2">
                  {t("experience.clients")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {exp.clients.map((client) => (
                    <Chip key={client} variant="primary" size="sm" className="font-mono">
                      {client}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#00FFFF] mb-2">
                {t("experience.techStack")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {exp.techStack.map((tech) => (
                  <Chip key={tech} variant="soft" size="sm" className="font-mono bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] text-[#FF00FF]">
                    {tech}
                  </Chip>
                ))}
              </div>
            </div>
          </SubCard>
        ))}
      </div>
    </AnimatedSection>
  );
}
