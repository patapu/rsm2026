"use client";

import { Chip } from "@heroui/react";
import { ME } from "@/lib/me";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";

export default function Education() {
  const { education, courses, learningNow } = ME;

  return (
    <AnimatedSection id="education" title="Education">
      <div className="space-y-6">
        {education.map((edu) => (
          <SubCard key={`${edu.institution}-${edu.field}`}>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {edu.institution}
            </h3>
            <p className="text-primary font-medium mb-1">{edu.degree}</p>
            <p className="text-foreground mb-2">{edu.field}</p>
            <div className="flex gap-3">
              <Chip variant="soft" size="sm">
                {edu.startYear} — {edu.endYear}
              </Chip>
              <Chip variant="soft" size="sm">
                GPA: {edu.gpa}
              </Chip>
            </div>
          </SubCard>
        ))}
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-primary mb-4">📚 Courses & Training</h3>
          <div className="flex flex-wrap gap-3">
            {courses.map((course) => (
              <Chip key={course.name} variant="soft" size="sm">
                {course.name} — {course.provider}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Learning Now */}
      {learningNow.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-primary mb-4">🚀 Currently Learning</h3>
          <div className="flex flex-wrap gap-3">
            {learningNow.map((item) => (
              <Chip key={item} variant="primary" size="sm">
                {item}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </AnimatedSection>
  );
}
