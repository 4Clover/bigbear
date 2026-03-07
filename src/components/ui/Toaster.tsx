'use client'

import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export const Toaster = () => {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        },
      }}
      richColors
    />
  )
}
