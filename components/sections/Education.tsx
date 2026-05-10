import { ME } from "@/lib/me";

export default function Education() {
  const { education, courses, learningNow } = ME;

  return (
    <section id="education" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 animate-on-slide">การศึกษา</h2>

      <div className="space-y-6 animate-on-slide-delay-1">
        {education.map((edu) => (
          <div
            key={`${edu.institution}-${edu.field}`}
            className="bg-surface border border-border rounded-lg p-6"
          >
            <h3 className="text-xl font-bold text-text mb-1">
              {edu.institution}
            </h3>
            <p className="text-accent font-medium mb-1">{edu.degree}</p>
            <p className="text-text mb-2">{edu.field}</p>
            <div className="flex gap-4 text-sm text-muted">
              <span>
                {edu.startYear} — {edu.endYear}
              </span>
              <span>GPA: {edu.gpa}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <div className="mt-10 animate-on-slide-delay-2">
          <h3 className="text-lg font-semibold text-accent mb-4">📚 Courses & Training</h3>
          <div className="flex flex-wrap gap-3">
            {courses.map((course) => (
              <div
                key={course.name}
                className="px-4 py-2 bg-surface border border-border rounded-lg"
              >
                <span className="text-text text-sm font-medium">{course.name}</span>
                <span className="text-muted text-xs ml-2">— {course.provider}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Now */}
      {learningNow.length > 0 && (
        <div className="mt-8 animate-on-slide-delay-2">
          <h3 className="text-lg font-semibold text-accent mb-4">🚀 กำลังเรียนรู้</h3>
          <div className="flex flex-wrap gap-3">
            {learningNow.map((item) => (
              <span
                key={item}
                className="px-3 py-1 bg-accent/10 border border-accent/30 text-accent rounded-full text-sm font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
