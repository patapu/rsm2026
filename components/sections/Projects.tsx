import { ME } from "@/lib/me";

export default function Projects() {
  const { projects } = ME;

  return (
    <section id="projects" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 animate-on-slide">โปรเจกต์</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-on-slide-delay-1">
        {projects.map((project) => (
          <div
            key={project.name}
            className="bg-surface border border-border rounded-lg p-6 flex flex-col"
          >
            <div className="mb-3">
              <h3 className="text-lg font-bold text-text">{project.name}</h3>
              <span className="text-xs text-accent">{project.category}</span>
            </div>

            <p className="text-sm text-text mb-3">{project.description}</p>

            <p className="text-xs text-muted mb-3">
              <span className="font-medium">Role:</span> {project.role}
            </p>

            {project.highlights.length > 0 && (
              <ul className="space-y-1 mb-4">
                {project.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-xs text-text flex items-start gap-2"
                  >
                    <span className="text-accent mt-0.5">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto">
              <div className="flex flex-wrap gap-1 mb-3">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Repository
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
