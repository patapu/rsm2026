"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import PageTransition from "./PageTransition"
import { useLocale } from "@/components/i18n/LocaleProvider"
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher"
import type { MessageKey } from "@/lib/i18n"

interface NavItem {
  labelKey: MessageKey
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.chat", href: "/" },
  { labelKey: "nav.resume", href: "/resume" },
  { labelKey: "nav.contact", href: "/contact" },
]

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLocale()

  return (
    <div className="flex min-h-screen">
      {/* Keyboard users can jump past the navigation. Styled in globals.css;
          it stays off-screen until it receives focus. */}
      <a href="#main-content" className="skip-link">
        {t("nav.skipToContent")}
      </a>

      {/* Left sidebar — sticky navigation */}
      <aside className="hidden md:flex w-52 flex-shrink-0 border-r-2 border-[rgba(0,255,255,0.3)] bg-[rgba(5,5,10,0.6)] backdrop-blur-sm">
        <nav className="sticky top-0 h-screen p-4 pt-8 flex flex-col">
          <div className="space-y-1 flex-1">
            <p className="font-mono text-lg font-bold neon-text-cyan tracking-widest mb-2 px-2">&gt;_ ปกร</p>
            <p className="text-[10px] font-mono text-[#FF00FF] mb-6 px-2 neon-text-magenta tracking-wider">
              ● ONLINE
            </p>
            {NAV_ITEMS.map(({ labelKey, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`block text-sm py-2 px-3 rounded-md transition-colors ${
                  pathname === href
                    ? "text-[#00FFFF] font-mono font-medium bg-[rgba(0,255,255,0.1)] border-l-2 border-[#00FFFF] neon-text-cyan"
                    : "text-foreground-500 font-mono hover:text-[#00FFFF] hover:bg-[rgba(0,255,255,0.05)] glitch-hover"
                }`}
              >
                {t(labelKey)}
              </Link>
            ))}
          </div>
          <div className="px-2 pb-2">
            <LanguageSwitcher />
          </div>
        </nav>
      </aside>

      {/* Mobile header. Two rows: identity plus the language switcher on top,
          the three nav links underneath, each taking an equal share of the
          width. A single row overflowed at 375px, which pushed "Contact" behind
          a horizontal scrollbar. The height is --mobile-header-h (globals.css)
          so <main> and the chat viewport reserve exactly that much space. */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-(--mobile-header-h) bg-[rgba(5,5,10,0.85)] backdrop-blur-sm border-b-2 border-[rgba(0,255,255,0.3)] px-3 pt-2 pb-1.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <p className="font-mono text-lg leading-7 font-bold neon-text-cyan tracking-widest">&gt;_ ปกร</p>
          <LanguageSwitcher />
        </div>
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ labelKey, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex-1 text-center text-sm py-1 rounded-md transition-colors font-mono ${
                pathname === href
                  ? "text-[#00FFFF] font-medium bg-[rgba(0,255,255,0.1)] border-b-2 border-[#00FFFF] neon-text-cyan"
                  : "text-foreground-500 hover:text-[#00FFFF]"
              }`}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content area. tabIndex lets the skip link land focus here. */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 mt-(--mobile-header-h) outline-none">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
