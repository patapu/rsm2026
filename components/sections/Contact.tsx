import { ME } from "@/lib/me";

export default function Contact() {
  const { contact, cta } = ME;

  return (
    <section id="contact" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 animate-on-slide-delay-4">ติดต่อ</h2>

      <div className="bg-surface border border-border rounded-lg p-6">
        {cta.availableForHire && (
          <p className="text-accent font-medium mb-6">
            🟢 เปิดรับโอกาสใหม่ — พร้อมรับงานและโปรเจกต์ที่น่าสนใจ
          </p>
        )}

        <div className="space-y-4">
          <div>
            <span className="text-muted text-sm">Email</span>
            <a
              href={`mailto:${contact.email}`}
              className="block text-accent hover:underline"
            >
              {contact.email}
            </a>
          </div>

          <div>
            <span className="text-muted text-sm">Phone</span>
            <a
              href={`tel:${contact.phone}`}
              className="block text-accent hover:underline"
            >
              {contact.phone}
            </a>
          </div>
        </div>

        {cta.resumePdfUrl && (
          <div className="mt-6">
            <a
              href={cta.resumePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-accent text-bg font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              ดาวน์โหลด Resume PDF
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
