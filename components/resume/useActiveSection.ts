"use client"

import { useEffect, useState } from "react"

/**
 * Tracks which section id is currently in view using IntersectionObserver.
 *
 * Pass the array of section ids rendered on the page. The initial active
 * section is the first id in the list.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState<string>(ids[0] ?? "")

  useEffect(() => {
    if (ids.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
    // ids is a stable array from module scope; stringify to be safe against
    // accidental new array references from consumers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")])

  return active
}
