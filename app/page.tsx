'use client'

import { useState } from 'react'
import Hero from "@/components/sections/Hero"
import Summary from "@/components/sections/Summary"
import Skills from "@/components/sections/Skills"
import Experience from "@/components/sections/Experience"
import Projects from "@/components/sections/Projects"
import Education from "@/components/sections/Education"
import Contact from "@/components/sections/Contact"
import Hobbies from "@/components/sections/Hobbies"
import ChatWidget from "@/components/chat/ChatWidget"
import ChatSlide from "@/components/chat/ChatSlide"
import HorizontalSlider from "@/components/HorizontalSlider"

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Two-tone alternating: dark → light → dark → light ...
  const slideThemes: ('dark' | 'light')[] = [
    'dark',   // Chat
    'light',  // Hero
    'dark',   // Summary
    'light',  // Skills
    'dark',   // Experience
    'light',  // Projects
    'dark',   // Education + Hobbies
    'light',  // Contact
  ]

  return (
    <>
      <HorizontalSlider onSlideChange={setCurrentSlide} slideThemes={slideThemes}>
        {/* Slide 1: Chat */}
        <ChatSlide />

        {/* Slide 2: Hero */}
        <Hero />

        {/* Slide 3: Summary */}
        <Summary />

        {/* Slide 4: Skills */}
        <Skills />

        {/* Slide 5: Experience */}
        <Experience />

        {/* Slide 6: Projects */}
        <Projects />

        {/* Slide 7: Education + Hobbies */}
        <div className="min-h-screen">
          <Education />
          <Hobbies />
        </div>

        {/* Slide 8: Contact */}
        <Contact />
      </HorizontalSlider>

      {/* Show floating chat button only when NOT on the chat slide */}
      {currentSlide !== 0 && <ChatWidget theme={slideThemes[currentSlide]} />}
    </>
  )
}
