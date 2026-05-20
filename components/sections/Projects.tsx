"use client";

import { Chip, Link } from "@heroui/react";
import { ME } from "@/lib/me";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";

export default function Projects() {
  const { projects } = ME;

  return (
    <AnimatedSection id="projects" title="Projects">
      <div className="grid grid-cols-1 gap-6">
        {projects.map((project) => (
          <SubCard key={project.name} className="flex flex-col">
            <div className="flex flex-col flex-1">
              <div className="mb-3">
                <h3 className="text-lg font-mono font-bold uppercase tracking-wider text-foreground">{project.name}</h3>
                <Chip variant="primary" size="sm" className="mt-1 font-mono">
                  {project.category}
                </Chip>
              </div>

              <p className="text-sm text-foreground mb-3">{project.description}</p>

              <p className="text-xs text-foreground-500 mb-3">
                <span className="font-medium">Role:</span> {project.role}
              </p>

              {project.highlights.length > 0 && (
                <ul className="space-y-1 mb-4">
                  {project.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="text-xs text-foreground flex items-start gap-2"
                    >
                      <span className="text-[#00FFFF] font-mono mt-0.5">{">"}</span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto">
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.techStack.map((tech) => (
                    <Chip key={tech} variant="soft" size="sm" className="font-mono bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] text-[#FF00FF]">
                      {tech}
                    </Chip>
                  ))}
                </div>

                <div className="flex gap-3">
                  {project.repoUrl && (
                    <Link
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00FFFF] font-mono text-xs hover:neon-text-cyan transition-all"
                    >
                      Repository
                    </Link>
                  )}
                  {project.liveUrl && (
                    <Link
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00FFFF] font-mono text-xs hover:neon-text-cyan transition-all"
                    >
                      Live Demo
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </SubCard>
        ))}
      </div>
    </AnimatedSection>
  );
}
