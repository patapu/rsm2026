import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SidebarLayout from "@/components/layout/SidebarLayout";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const TITLE: Record<Locale, string> = {
  th: "ปกร เชาวนประเสริฐ — Lead Developer",
  en: "Pakorn Chaowanaprasert — Lead Developer",
};

const DESCRIPTION: Record<Locale, string> = {
  th: "Resume ของ ปกร เชาวนประเสริฐ (เกื้อ) — Lead Developer ที่มีประสบการณ์กว่า 8 ปี ในการพัฒนา CRM platform",
  en: "Resume of Pakorn Chaowanaprasert (Kur) — a Lead Developer with 8+ years of experience building CRM platforms",
};

// Dynamic (locale depends on the `locale` cookie via `getServerLocale`) —
// `icons` and `manifest` are unchanged from the previous static `metadata`.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: TITLE[locale],
    description: DESCRIPTION[locale],
    icons: {
      icon: [
        { url: "/favicon/favicon.ico", sizes: "any" },
        { url: "/favicon/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
      apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/favicon/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans antialiased">
        <LocaleProvider initialLocale={locale}>
          <SidebarLayout>
            {children}
          </SidebarLayout>
        </LocaleProvider>
      </body>
    </html>
  );
}
