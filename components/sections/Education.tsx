"use client";

import { Chip } from "@heroui/react";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { useLocale } from "@/components/i18n/LocaleProvider";

export default function Education() {
  const { me, t } = useLocale();
  const { education, courses, learningNow } = me;

  return (
    <AnimatedSection id="education" title={t("sections.education")}>
      <div className="space-y-6">
        {education.map((edu) => (
          <SubCard key={`${edu.institution}-${edu.field}`}>
            <h3 className="text-xl font-mono font-bold uppercase tracking-wider text-foreground mb-1">
              {edu.institution}
            </h3>
            <p className="text-[#00FFFF] font-mono font-medium neon-text-cyan mb-1">{edu.degree}</p>
            <p className="text-foreground mb-2">{edu.field}</p>
            <div className="flex gap-3">
              <Chip variant="soft" size="sm" className="font-mono bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] text-[#FF00FF]">
                {edu.startYear} - {edu.endYear}
              </Chip>
              <Chip variant="soft" size="sm" className="font-mono bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] text-[#FF00FF]">
                GPA: {edu.gpa}
              </Chip>
            </div>
          </SubCard>
        ))}
      </div>

      {/* Courses and Currently Learning share one heading. `learningNow` keeps
          the accent `primary` chip so "in progress" still reads at a glance
          without needing a second heading of its own. */}
      {(courses.length > 0 || learningNow.length > 0) && (
        <div className="mt-10">
          <h3 className="text-base font-mono font-semibold uppercase tracking-wider neon-text-cyan mb-4">📚 {t("education.coursesAndTraining")}</h3>
          <div className="flex flex-wrap gap-3">
            {courses.map((course) => (
              <Chip key={course.name} variant="soft" size="sm" className="font-mono bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] text-[#FF00FF]">
                {course.name}
              </Chip>
            ))}
            {learningNow.map((item) => (
              <Chip key={item} variant="primary" size="sm" className="font-mono">
                🚀 {item}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </AnimatedSection>
  );
}
