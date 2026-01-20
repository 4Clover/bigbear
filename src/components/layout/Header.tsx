'use client'

import { Menu, TreePine, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button, ThemeToggle } from '@/components/ui'

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/book', label: 'Book Now' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <TreePine className="h-8 w-8 text-forest-500" />
              <span className="text-xl font-bold text-foreground">Big Bear Cabin</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-forest-500 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen)
              }}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-forest-500 font-medium transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false)
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => {
                  setMobileMenuOpen(false)
                }}
              >
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
