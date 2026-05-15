import { Card, CardContent, Button } from "@heroui/react"
import { ME, getAvailableMessage } from "@/lib/me"

export default function ContactPage() {
  const { contact, cta } = ME
  // Computed once per server render. The message only changes once per month
  // so cross-midnight drift between server render and client hydrate is benign.
  const availableMessage = getAvailableMessage(new Date())

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">Contact</h1>

      <Card className="bg-default-100">
        <CardContent className="p-6 space-y-6">
          {cta.availableForHire && (
            <div
              className="bg-primary/10 border border-primary/30 rounded-lg p-4"
              data-testid="available-for-hire"
            >
              <p className="text-primary font-medium">
                🟢 {availableMessage}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-medium text-foreground-500 mb-1">Email</h2>
            <a
              href={`mailto:${contact.email}`}
              className="text-primary hover:underline text-lg"
              data-testid="contact-email"
            >
              {contact.email}
            </a>
          </div>

          <div>
            <h2 className="text-sm font-medium text-foreground-500 mb-1">Phone</h2>
            <a
              href={`tel:${contact.phone}`}
              className="text-primary hover:underline text-lg"
              data-testid="contact-phone"
            >
              {contact.phone}
            </a>
          </div>

          {cta.resumePdfUrl && (
            <div data-testid="pdf-download">
              <a href={cta.resumePdfUrl} download>
                <Button variant="primary" size="lg">
                  Download Resume (PDF)
                </Button>
              </a>
            </div>
          )}

          {cta.message && (
            <p className="text-foreground-500 italic text-sm">
              {cta.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
