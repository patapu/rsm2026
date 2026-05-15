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
      <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-divider">
        <nav className="sticky top-0 h-screen p-4 pt-8 space-y-1">
          <p className="text-lg font-bold text-foreground mb-6 px-2">ปกร</p>
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`block text-sm py-2 px-3 rounded-md transition-colors ${
                pathname === href
                  ? "text-primary font-medium bg-primary/10"
                  : "text-foreground-500 hover:text-foreground hover:bg-default-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-divider px-4 py-3 flex items-center gap-4">
        <p className="text-lg font-bold text-foreground">ปกร</p>
        <nav className="flex gap-2">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm py-1 px-2 rounded-md transition-colors ${
                pathname === href
                  ? "text-primary font-medium bg-primary/10"
                  : "text-foreground-500"
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
