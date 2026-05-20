"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import PageTransition from "./PageTransition"

interface NavItem {
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: "Chat", href: "/" },
  { label: "Resume", href: "/resume" },
  { label: "Contact", href: "/contact" },
]

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar — sticky navigation */}
      <aside className="hidden md:flex w-52 flex-shrink-0 border-r-2 border-[rgba(0,255,255,0.3)] bg-[rgba(5,5,10,0.6)] backdrop-blur-sm">
        <nav className="sticky top-0 h-screen p-4 pt-8 space-y-1">
          <p className="font-mono text-lg font-bold neon-text-cyan tracking-widest mb-2 px-2">&gt;_ ปกร</p>
          <p className="text-[10px] font-mono text-[#FF00FF] mb-6 px-2 neon-text-magenta tracking-wider">
            ● ONLINE
          </p>
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`block text-sm py-2 px-3 rounded-md transition-colors ${
                pathname === href
                  ? "text-[#00FFFF] font-mono font-medium bg-[rgba(0,255,255,0.1)] border-l-2 border-[#00FFFF] neon-text-cyan"
                  : "text-foreground-500 font-mono hover:text-[#00FFFF] hover:bg-[rgba(0,255,255,0.05)] glitch-hover"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[rgba(5,5,10,0.85)] backdrop-blur-sm border-b-2 border-[rgba(0,255,255,0.3)] px-4 py-3 flex items-center gap-4">
        <p className="font-mono text-lg font-bold neon-text-cyan tracking-widest">&gt;_ ปกร</p>
        <nav className="flex gap-2">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm py-1 px-2 rounded-md transition-colors font-mono ${
                pathname === href
                  ? "text-[#00FFFF] font-medium bg-[rgba(0,255,255,0.1)] border-l-2 border-[#00FFFF] neon-text-cyan"
                  : "text-foreground-500 hover:text-[#00FFFF]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content area */}
      <main className="flex-1 min-w-0 mt-14 md:mt-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
