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

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[rgba(5,5,10,0.85)] backdrop-blur-sm border-b-2 border-[rgba(0,255,255,0.3)] px-4 py-3 flex items-center gap-2">
        <p className="font-mono text-lg font-bold neon-text-cyan tracking-widest shrink-0">&gt;_ ปกร</p>
        {/* min-w-0 lets the nav shrink instead of pushing the switcher off-screen
            on narrow viewports; the switcher itself must never shrink. */}
        <nav className="flex gap-2 flex-1 min-w-0 overflow-x-auto">
          {NAV_ITEMS.map(({ labelKey, href }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm py-1 px-2 rounded-md transition-colors font-mono ${
                pathname === href
                  ? "text-[#00FFFF] font-medium bg-[rgba(0,255,255,0.1)] border-l-2 border-[#00FFFF] neon-text-cyan"
                  : "text-foreground-500 hover:text-[#00FFFF]"
              }`}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="shrink-0">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 min-w-0 mt-14 md:mt-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
