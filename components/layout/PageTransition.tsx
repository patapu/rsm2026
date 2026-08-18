"use client"

import { AnimatePresence, motion, type Variants } from "framer-motion"
import { usePathname } from "next/navigation"

/**
 * Cyberpunk glitch transition — filter pulse + slight horizontal shift only.
 *
 * Why no clip-path: clip-path that hides content (e.g. `inset(0 0 100% 0)`)
 * creates a blank frame during `AnimatePresence mode="wait"` between exit-end
 * and enter-start. On long pages the blank frame is masked by incoming
 * content, but on short pages like /contact it's clearly visible as a flash
 * that reads as "double redirect."
 *
 * This version keeps `opacity` high (≥ 0.55) and uses only filter + translate,
 * so content stays visible throughout — no compositor-level "nothing on top
 * of body" frame, no flicker.
 *
 * Why no `style={{ willChange }}`: an inline will-change is permanent, and this
 * wrapper wraps the entire page. Declaring `will-change: filter` here pinned a
 * filter pipeline and its own compositing layer for the whole document for as
 * long as the tab stayed open, long after the 0.2s transition had finished.
 * framer-motion already sets will-change while an animation is in flight and
 * clears it afterwards, which is the behaviour we actually wanted.
 */
const glitchVariants: Variants = {
  initial: {
    opacity: 0.55,
    filter: "brightness(1.6) saturate(2) hue-rotate(18deg)",
    x: -6,
  },
  animate: {
    opacity: 1,
    filter: "brightness(1) saturate(1) hue-rotate(0deg)",
    x: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0.55,
    filter: "brightness(1.6) saturate(2) hue-rotate(-18deg)",
    x: 6,
    transition: { duration: 0.1, ease: "easeIn" },
  },
}

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={glitchVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
