'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

// Inner component that uses theme - only rendered on client
function ThemeToggleInner() {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isScrolling, setIsScrolling] = useState(false)

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  return (
    <button
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark')
      }}
      className={`
        fixed bottom-4 right-4 z-50
        p-2.5 rounded-xl transition-all duration-500 ease-in-out
        bg-card hover:bg-stone-200 dark:hover:bg-stone-700
        text-muted-foreground hover:text-foreground
        shadow-lg border border-border
        ${isScrolling ? 'opacity-10' : 'opacity-100'}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

// Placeholder shown during SSR/loading
function ThemeToggleSkeleton() {
  return (
    <button
      disabled
      className="fixed bottom-4 right-4 z-50 p-2.5 rounded-xl bg-card text-muted-foreground opacity-50 cursor-not-allowed shadow-lg border border-border"
      aria-label="Loading theme toggle"
    >
      <Sun className="h-5 w-5" />
    </button>
  )
}

// Export with ssr: false to avoid hydration mismatch
export const ThemeToggle = dynamic(() => Promise.resolve(ThemeToggleInner), {
  ssr: false,
  loading: () => <ThemeToggleSkeleton />,
})
