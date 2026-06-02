import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SidebarLayout from "@/components/layout/SidebarLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ปกร เชาวนประเสริฐ — Lead Developer",
  description:
    "Resume ของ ปกร เชาวนประเสริฐ (เกื้อ) — Lead Developer ที่มีประสบการณ์กว่า 8 ปี ในการพัฒนา CRM platform",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans antialiased">
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}
