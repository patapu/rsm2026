"use client";

import { Avatar, Button, Card, CardContent, Chip, Link, Separator } from "@heroui/react";
import { motion } from "framer-motion";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { ME } from "@/lib/me";

export default function Hero() {
  const { me, locale } = useLocale();
  const { profile, contact } = me;

  // The two PDF download buttons must always resolve to the genuinely-Thai
  // and genuinely-English files, regardless of the active locale. `me.cta`
  // is locale-swapped (on `en` it overrides `resumePdfUrl` to the English
  // file too), so source both paths from the canonical Thai dataset, which
  // carries both `resumePdfUrl` (TH) and `resumePdfUrlEn` (EN) correctly.
  const resumePdfUrlTH = ME.cta.resumePdfUrl;
  const resumePdfUrlEN = ME.cta.resumePdfUrlEn;

  const displayFirstName = locale === "en" ? profile.firstName : profile.firstNameTH;
  const displayLastName = locale === "en" ? profile.lastName : profile.lastNameTH;
  const displayNickname = locale === "en" ? profile.nickname : profile.nicknameTH;

  return (
    <motion.section
      id="hero"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-[rgba(13,13,26,0.6)] backdrop-blur-md border border-[rgba(0,255,255,0.3)] shadow-[0_0_15px_rgba(0,255,255,0.15),inset_0_0_30px_rgba(255,0,255,0.05)]">
        <CardContent className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
          <Avatar className="w-40 h-40 mb-8 border-2 border-[#00FFFF] shadow-[0_0_20px_rgba(0,255,255,0.5)]">
            <Avatar.Image
              src="/profile.png"
              alt={`${displayFirstName} ${displayLastName}`}
            />
            <Avatar.Fallback>{displayNickname}</Avatar.Fallback>
          </Avatar>

          {/* Fluid size plus `break-words`, so a long single-word surname never
              spills out of the card: the old fixed steps clipped
              "CHAOWANAPRASERT" on every viewport narrower than 2xl. The explicit
              space before the nickname keeps it a separate word; without it
              "SURNAME(KUR)" rendered as one unbreakable token. */}
          <h1 className="text-[clamp(1.125rem,6.4vw,1.75rem)] md:text-[clamp(1.5rem,3.6vw,3rem)] font-mono font-bold uppercase tracking-wider neon-text-cyan mb-2 break-words">
            {displayFirstName} {displayLastName}
            {displayNickname && (
              <>
                {" "}
                <span className="text-foreground-500 text-[0.6em] whitespace-nowrap">
                  ({displayNickname})
                </span>
              </>
            )}
          </h1>

          <Chip variant="soft" size="lg" className="mb-4 font-mono uppercase tracking-wider bg-[rgba(0,255,255,0.08)] border border-[#00FFFF] text-[#00FFFF] neon-border-cyan">
            {profile.title}
          </Chip>

          <p className="text-base sm:text-lg text-foreground-500 italic mb-8">{profile.tagline}</p>

          {/* PDF Download Buttons */}
          {(resumePdfUrlTH || resumePdfUrlEN) && (
            <div className="mb-8 flex flex-wrap justify-center gap-3 sm:gap-4">
              {resumePdfUrlTH && (
                <a href={resumePdfUrlTH} download>
                  <Button variant="primary" size="lg" className="font-mono uppercase tracking-wider neon-border-cyan">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Resume (TH)
                  </Button>
                </a>
              )}
              {resumePdfUrlEN && (
                <a href={resumePdfUrlEN} download>
                  <Button variant="primary" size="lg" className="font-mono uppercase tracking-wider neon-border-cyan">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Resume (EN)
                  </Button>
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={`mailto:${contact.email}`} className="text-[#00FFFF] hover:neon-text-cyan transition-all font-mono text-sm">
              {contact.email}
            </Link>
            <Link href={`tel:${contact.phone}`} className="text-[#00FFFF] hover:neon-text-cyan transition-all font-mono text-sm">
              {contact.phone}
            </Link>
            {contact.linkedin && (
              <Link href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#00FFFF] hover:neon-text-cyan transition-all font-mono text-sm">
                LinkedIn
              </Link>
            )}
            {contact.website && (
              <Link href={contact.website} target="_blank" rel="noopener noreferrer" className="text-[#00FFFF] hover:neon-text-cyan transition-all font-mono text-sm">
                Website
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="my-8 h-px bg-gradient-to-r from-transparent via-[rgba(0,255,255,0.4)] to-transparent" />
    </motion.section>
  );
}
