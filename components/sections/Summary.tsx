import { ME } from "@/lib/me";

export default function Summary() {
  const { summary } = ME;

  return (
    <section id="summary" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-6 animate-on-slide">สรุป</h2>

      <div className="mb-6 animate-on-slide-delay-1">
        <span className="text-accent text-5xl font-bold">
          {summary.yearsOfExperience}
        </span>
        <span className="text-muted text-lg ml-2">ปีประสบการณ์</span>
      </div>

      <p className="text-text leading-relaxed mb-8 animate-on-slide-delay-2">{summary.bio}</p>

      <ul className="space-y-3 animate-on-slide-delay-3">
        {summary.highlights.map((highlight, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-accent mt-1">•</span>
            <span className="text-text">{highlight}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
