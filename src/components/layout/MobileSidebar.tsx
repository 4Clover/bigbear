'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface MobileSidebarProps {
  children: ReactNode
}

export const MobileSidebar = ({ children }: MobileSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors bg-card border border-border"
        onClick={() => {
          setIsOpen(true)
        }}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <aside className="hidden md:flex w-64 flex-col">{children}</aside>

      <div className="md:hidden">

        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
          onClick={() => {
            setIsOpen(false)
          }}
          aria-hidden="true"
        />


        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-card z-50 transform transition-transform duration-300 ease-in-out border-r border-border flex flex-col ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-end p-4 border-b border-border">
            <button
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => {
                setIsOpen(false)
              }}
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </aside>
      </div>
    </>
  )
}
