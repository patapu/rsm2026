"use client";

import { ME } from "@/lib/me";
import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";

function FrequencyStars({ frequency }: { frequency: number }) {
  return (
    <span className="text-sm" aria-label={`ความถี่ ${frequency} จาก 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < frequency ? "text-primary" : "text-foreground-500/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Hobbies() {
  const { hobbies } = ME;

  return (
    <AnimatedSection id="hobbies" title="Hobbies" withSeparator={false}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {hobbies.map((hobby) => (
          <SubCard key={hobby.name}>
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label={hobby.name}>
                {hobby.icon}
              </span>
              <div>
                <p className="text-foreground font-medium">{hobby.name}</p>
                <FrequencyStars frequency={hobby.frequency} />
              </div>
            </div>
          </SubCard>
        ))}
      </div>
    </AnimatedSection>
  );
}
