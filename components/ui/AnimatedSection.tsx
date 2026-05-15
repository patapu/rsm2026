"use client"

import { Separator } from "@heroui/react"
import { motion } from "framer-motion"
import SectionCard from "./SectionCard"

interface AnimatedSectionProps {
  id: string
  title: string
  /**
   * Render a separator under the section card. Most sections want this so
   * they visually divide; the final section on the page should pass `false`.
   */
  withSeparator?: boolean
  children: React.ReactNode
}

/**
 * Shared wrapper for every top-level resume section.
 * Handles the fade/slide-in animation, the h2 heading, and the closing
 * separator, so individual section components can focus on their content.
 */
export default function AnimatedSection({
  id,
  title,
  withSeparator = true,
  children,
}: AnimatedSectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.4 }}
    >
      <SectionCard>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
          {title}
        </h2>
        {children}
      </SectionCard>
      {withSeparator && <Separator className="my-6" />}
    </motion.section>
  )
}
