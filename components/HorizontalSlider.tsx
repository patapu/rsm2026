'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'

interface HorizontalSliderProps {
  children: ReactNode[]
  onSlideChange?: (index: number) => void
  /** Alternating theme pattern: 'dark' or 'light' per slide index */
  slideThemes?: ('dark' | 'light')[]
}

/**
 * Horizontal slider component — swipe left/right between slides.
 * Supports touch swipe and keyboard navigation.
 */
export default function HorizontalSlider({ children, onSlideChange, slideThemes }: HorizontalSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const totalSlides = children.length

  const goToSlide = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalSlides - 1))
    setCurrentSlide(clamped)
    onSlideChange?.(clamped)

    // Scroll the target slide back to top
    if (containerRef.current) {
      const slideEl = containerRef.current.children[clamped] as HTMLElement | undefined
      if (slideEl) {
        slideEl.scrollTop = 0
      }
    }
  }, [totalSlides, onSlideChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToSlide(currentSlide + 1)
      } else if (e.key === 'ArrowLeft') {
        goToSlide(currentSlide - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, goToSlide])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (diff > threshold) {
      // Swiped left → next slide
      goToSlide(currentSlide + 1)
    } else if (diff < -threshold) {
      // Swiped right → previous slide
      goToSlide(currentSlide - 1)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Slides container */}
      <div
        ref={containerRef}
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}vw)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children.map((child, index) => {
          const theme = slideThemes?.[index] ?? (index % 2 === 0 ? 'dark' : 'light')
          const isActive = currentSlide === index
          const themeClass = theme === 'light' ? 'slide-light' : 'slide-dark'
          const activeClass = isActive ? 'slide-active' : 'slide-inactive'
          const bgColor = theme === 'light' ? '#ffffff' : '#0a0a0a'
          const textColor = theme === 'light' ? '#111111' : '#e5e5e5'

          return (
            <div
              key={index}
              className={`w-screen h-screen flex-shrink-0 overflow-y-auto flex flex-col ${themeClass} ${activeClass}`}
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {child}
            </div>
          )
        })}
      </div>

      {/* Slide indicators */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2">
        {Array.from({ length: totalSlides }).map((_, index) => {
          const currentTheme = slideThemes?.[currentSlide] ?? (currentSlide % 2 === 0 ? 'dark' : 'light')
          const inactiveColor = currentTheme === 'light' ? 'bg-gray-400 hover:bg-gray-600' : 'bg-muted hover:bg-text'
          return (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`ไปยังสไลด์ ${index + 1}`}
              className={`rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? 'w-8 h-2 bg-accent'
                  : `w-2 h-2 ${inactiveColor}`
              }`}
            />
          )
        })}
      </div>

      {/* Arrow navigation (desktop) */}
      {currentSlide > 0 && (
        <button
          onClick={() => goToSlide(currentSlide - 1)}
          className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex w-10 h-10 items-center justify-center rounded-full transition-colors ${
            (slideThemes?.[currentSlide] ?? (currentSlide % 2 === 0 ? 'dark' : 'light')) === 'light'
              ? 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-100'
              : 'bg-surface border border-border text-text hover:bg-border'
          }`}
          aria-label="สไลด์ก่อนหน้า"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={() => goToSlide(currentSlide + 1)}
          className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex w-10 h-10 items-center justify-center rounded-full transition-colors ${
            (slideThemes?.[currentSlide] ?? (currentSlide % 2 === 0 ? 'dark' : 'light')) === 'light'
              ? 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-100'
              : 'bg-surface border border-border text-text hover:bg-border'
          }`}
          aria-label="สไลด์ถัดไป"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
