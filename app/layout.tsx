import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ปกร เชาวนประเสริฐ — Lead Developer",
  description:
    "Resume ของ ปกร เชาวนประเสริฐ (เกื้อ) — Lead Developer ที่มีประสบการณ์กว่า 8 ปี ในการพัฒนา CRM platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={inter.variable}>
      <body className="bg-bg text-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
