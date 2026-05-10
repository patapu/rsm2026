import Image from "next/image";
import { ME } from "@/lib/me";

export default function Hero() {
  const { profile, contact, cta } = ME;

  return (
    <section
      id="hero"
      className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center"
    >
      <div className="mb-8 animate-scale-in">
        <Image
          src="/profile.png"
          alt={`${profile.firstNameTH} ${profile.lastNameTH}`}
          width={300}
          height={300}
          className="rounded-full border-2 border-accent mx-auto"
          priority
        />
      </div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text mb-2 animate-on-slide-delay-1">
        {profile.firstNameTH} {profile.lastNameTH}
        <span className="text-muted text-xl sm:text-2xl ml-2 sm:ml-3">({profile.nicknameTH})</span>
      </h1>

      <p className="text-lg sm:text-xl text-accent font-medium mb-4 animate-on-slide-delay-2">{profile.title}</p>

      <p className="text-base sm:text-lg text-muted italic mb-8 animate-on-slide-delay-3">{profile.tagline}</p>

      {/* PDF Download Button for HR */}
      {cta.resumePdfUrl && (
        <div className="mb-8 animate-on-slide-delay-3">
          <a
            href={cta.resumePdfUrl}
            download
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent/90 transition-all duration-200 hover:scale-105 shadow-lg shadow-accent/20"
          >
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
            ดาวน์โหลด Resume (PDF)
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center animate-on-slide-delay-4">
        <a
          href={`mailto:${contact.email}`}
          className="text-accent hover:underline"
        >
          {contact.email}
        </a>
        <a
          href={`tel:${contact.phone}`}
          className="text-accent hover:underline"
        >
          {contact.phone}
        </a>
        {contact.linkedin && contact.linkedin !== "coming soon" && (
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            LinkedIn
          </a>
        )}
        {contact.website && contact.website !== "coming soon" && (
          <a
            href={contact.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Website
          </a>
        )}
      </div>
    </section>
  );
}
