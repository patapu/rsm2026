"use client";

import SubCard from "@/components/ui/SubCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { useLocale } from "@/components/i18n/LocaleProvider";

function FrequencyStars({ frequency, label }: { frequency: number; label: string }) {
  return (
    <span className="text-sm" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < frequency ? "text-[#00FFFF] drop-shadow-[0_0_4px_rgba(0,255,255,0.7)]" : "text-foreground-500/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Hobbies() {
  const { me, t } = useLocale();
  const { hobbies } = me;

  return (
    <AnimatedSection id="hobbies" title={t("sections.hobbies")} withSeparator={false}>
      {/* Three columns only from xl: at md/lg the left sidebar (and from lg
          the right one) leave each tile about 130px, and the name next to
          the emoji was squeezed into a 19px column and clipped. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {hobbies.map((hobby) => (
          <SubCard key={hobby.name}>
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label={hobby.name}>
                {hobby.icon}
              </span>
              <div className="min-w-0">
                <p className="text-foreground font-medium break-words">{hobby.name}</p>
                <FrequencyStars
                  frequency={hobby.frequency}
                  label={t("hobbies.frequencyLabel", { n: hobby.frequency })}
                />
              </div>
            </div>
          </SubCard>
        ))}
      </div>
    </AnimatedSection>
  );
}
