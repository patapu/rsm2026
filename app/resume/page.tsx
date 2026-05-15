'use client'

import dynamic from 'next/dynamic'
import Hero from '@/components/sections/Hero'
import Summary from '@/components/sections/Summary'
import Skills from '@/components/sections/Skills'
import Experience from '@/components/sections/Experience'
import Projects from '@/components/sections/Projects'
import Education from '@/components/sections/Education'
import Hobbies from '@/components/sections/Hobbies'

const RightSidebar = dynamic(() => import('@/components/resume/RightSidebar'), {
  ssr: false,
})

export default function ResumePage() {
  return (
    <div className="flex max-w-6xl mx-auto px-4 py-8">
      {/* Main content — scrollable */}
      <div className="flex-1 min-w-0">
        <Hero />
        <Summary />
        <Skills />
        <Experience />
        <Projects />
        <Education />
        <Hobbies />
      </div>

      {/* Right sidebar — sticky "On this page" */}
      <div className="hidden lg:block w-48 flex-shrink-0 ml-8">
        <div className="sticky top-8">
          <RightSidebar />
        </div>
      </div>
    </div>
  )
}
