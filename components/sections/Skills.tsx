import { ME } from "@/lib/me";
import type { Skill } from "@/lib/me";

const categoryLabels: Record<string, string> = {
  languages: "ภาษา",
  frameworks: "Frameworks",
  databases: "Databases",
  devops: "DevOps",
  tools: "Tools",
};

function SkillBar({ skill }: { skill: Skill }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-text text-sm">{skill.name}</span>
        <span className="text-muted text-sm">{skill.level}%</span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full"
          style={{ width: `${skill.level}%` }}
        />
      </div>
    </div>
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
    <section id="skills" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 animate-on-slide">ทักษะ</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-on-slide-delay-1">
        {categories.map(({ key, label, items }) => (
          <div key={key} className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-accent mb-4">{label}</h3>
            {items.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-8 animate-on-slide-delay-2">
        <h3 className="text-lg font-semibold text-accent mb-4">Soft Skills</h3>
        <div className="flex flex-wrap gap-3">
          {skills.softSkills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 bg-surface border border-border rounded-full text-sm text-text"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
