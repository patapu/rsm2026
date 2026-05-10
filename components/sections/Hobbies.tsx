import { ME } from "@/lib/me";

export default function Hobbies() {
  const { hobbies } = ME;

  return (
    <section id="hobbies" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 animate-on-slide-delay-2">งานอดิเรก</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-on-slide-delay-3">
        {hobbies.map((hobby) => (
          <div
            key={hobby.name}
            className="bg-surface border border-border rounded-lg p-4 flex flex-col items-center text-center"
          >
            <span className="text-3xl mb-2">{hobby.icon}</span>
            <span className="text-text text-sm font-medium mb-1">{hobby.name}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${i < hobby.frequency ? 'text-accent' : 'text-border'}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
