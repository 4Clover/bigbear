'use client'

import dynamic from 'next/dynamic'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

interface ThemeToggleProps {
  className?: string
}

// Inner component that uses theme - only rendered on client
function ThemeToggleInner({ className = '' }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark')
      }}
      className={`
        p-2 rounded-lg transition-colors duration-200
        bg-muted hover:bg-stone-200 dark:hover:bg-stone-700
        text-muted-foreground hover:text-foreground
        ${className}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

// Placeholder shown during SSR/loading
function ThemeToggleSkeleton({ className = '' }: ThemeToggleProps) {
  return (
    <button
      disabled
      className={`p-2 rounded-lg bg-muted text-muted-foreground opacity-50 cursor-not-allowed ${className}`}
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
