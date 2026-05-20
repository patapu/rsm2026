"use client";

import { Avatar, Button, Card, CardContent, Chip, Link, Separator } from "@heroui/react";
import { motion } from "framer-motion";
import { ME } from "@/lib/me";

export default function Hero() {
  const { profile, contact, cta } = ME;

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
              alt={`${profile.firstNameTH} ${profile.lastNameTH}`}
            />
            <Avatar.Fallback>{profile.nicknameTH}</Avatar.Fallback>
          </Avatar>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold uppercase tracking-widest neon-text-cyan mb-2">
            {profile.firstNameTH} {profile.lastNameTH}
            {profile.nicknameTH && (
              <span className="text-foreground-500 text-xl sm:text-2xl ml-2 sm:ml-3">
                ({profile.nicknameTH})
              </span>
            )}
          </h1>

          <Chip variant="soft" size="lg" className="mb-4 font-mono uppercase tracking-wider bg-[rgba(0,255,255,0.08)] border border-[#00FFFF] text-[#00FFFF] neon-border-cyan">
            {profile.title}
          </Chip>

          <p className="text-base sm:text-lg text-foreground-500 italic mb-8">{profile.tagline}</p>

          {/* PDF Download Button */}
          {cta.resumePdfUrl && (
            <div className="mb-8">
              <a href={cta.resumePdfUrl} download>
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
                  Download Resume (PDF)
                </Button>
              </a>
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
