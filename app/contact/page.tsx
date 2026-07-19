"use client"

import { Card, CardContent, Button } from "@heroui/react"
import { getAvailableMessage } from "@/lib/me"
import { useLocale } from "@/components/i18n/LocaleProvider"

export default function ContactPage() {
  const { me, t, locale } = useLocale()
  const { contact, cta } = me
  // Computed once per render, localized. The message only changes once per
  // month so cross-midnight drift between server render and client hydrate
  // is benign.
  const availableMessage = getAvailableMessage(new Date(), locale)
  // English CV PDF only if one is configured; otherwise fall back to the
  // default (Thai) PDF rather than showing a dead link.
  const resumePdfUrl = locale === "en" && cta.resumePdfUrlEn ? cta.resumePdfUrlEn : cta.resumePdfUrl

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("contact.title")}</h1>

      <Card className="bg-default-100">
        <CardContent className="p-6 space-y-6">
          {cta.availableForHire && (
            <div
              className="bg-[rgba(0,255,255,0.08)] border border-[rgba(0,255,255,0.3)] neon-border-cyan rounded-lg p-4"
              data-testid="available-for-hire"
            >
              <p className="text-primary font-medium">
                🟢 {availableMessage}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-medium text-foreground-500 mb-1">{t("contact.email")}</h2>
            <a
              href={`mailto:${contact.email}`}
              className="text-primary hover:underline text-lg"
              data-testid="contact-email"
            >
              {contact.email}
            </a>
          </div>

          <div>
            <h2 className="text-sm font-medium text-foreground-500 mb-1">{t("contact.phone")}</h2>
            <a
              href={`tel:${contact.phone}`}
              className="text-primary hover:underline text-lg"
              data-testid="contact-phone"
            >
              {contact.phone}
            </a>
          </div>

          {resumePdfUrl && (
            <div data-testid="pdf-download">
              <a href={resumePdfUrl} download>
                <Button variant="primary" size="lg">
                  {t("contact.downloadResume")}
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
