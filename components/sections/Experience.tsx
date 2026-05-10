import { ME } from "@/lib/me";

export default function Experience() {
  const { experience } = ME;

  // Sort newest first (by startDate descending)
  const sorted = [...experience].sort(
    (a, b) => b.startDate.localeCompare(a.startDate)
  );

  return (
    <section id="experience" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 animate-on-slide">ประสบการณ์</h2>

      <div className="space-y-12 animate-on-slide-delay-1">
        {sorted.map((exp) => (
          <div
            key={exp.company}
            className="bg-surface border border-border rounded-lg p-6"
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h3 className="text-2xl font-bold text-text">{exp.company}</h3>
              <span className="px-2 py-0.5 bg-accent/10 text-accent text-sm rounded">
                {exp.workModel}
              </span>
              {exp.teamSize && (
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-sm rounded">
                  👥 Team {exp.teamSize}
                </span>
              )}
              <span className="text-muted text-sm">
                {exp.startDate} — {exp.endDate}
              </span>
            </div>

            <p className="text-text mb-4">{exp.summary}</p>

            {/* Career Growth */}
            {exp.roles.length > 1 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-accent mb-2">
                  Career Growth
                </h4>
                <div className="space-y-1">
                  {exp.roles.map((role, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-text font-medium">{role.title}</span>
                      <span className="text-muted">
                        ({role.startDate} — {role.endDate})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-accent mb-2">
                Responsibilities
              </h4>
              <ul className="space-y-1">
                {exp.responsibilities.map((item, i) => (
                  <li key={i} className="text-sm text-text flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Achievements */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-accent mb-2">
                Achievements
              </h4>
              <ul className="space-y-1">
                {exp.achievements.map((ach, i) => (
                  <li key={i} className="text-sm text-text flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>
                      {ach.metric}: <strong>{ach.value}</strong> — {ach.context}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Clients */}
            {exp.clients.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-accent mb-2">
                  Clients
                </h4>
                <div className="flex flex-wrap gap-2">
                  {exp.clients.map((client) => (
                    <span
                      key={client}
                      className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded"
                    >
                      {client}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            <div>
              <h4 className="text-sm font-semibold text-accent mb-2">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-2">
                {exp.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 bg-surface border border-border text-text text-xs rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
