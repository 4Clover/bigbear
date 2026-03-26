'use client'

import { LayoutDashboard, LogOut, Menu, TreePine, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { Button } from '@/components/ui'

interface HeaderProps {
  session?: Session | null
}

const getDashboardUrl = (role: string): string | null => {
  switch (role) {
    case 'OWNER':
      return '/owner/dashboard'
    case 'WORKER':
      return '/worker/jobs'
    default:
      return null
  }
}

export const Header = ({ session }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/book', label: 'Book Now' },
    { href: '/contact', label: 'Contact' },
  ]

  const user = session?.user
  const dashboardUrl = user ? getDashboardUrl(user.role) : null

  const handleSignOut = () => {
    void signOut({ callbackUrl: '/' })
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <TreePine className="h-8 w-8 text-forest-500" />
              <span className="text-xl font-bold text-foreground">Grizzly Getaway</span>
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
            {user ? (
              <div className="flex items-center gap-2">
                {dashboardUrl && (
                  <Link href={dashboardUrl}>
                    <Button variant="outline" size="sm">
                      <LayoutDashboard className="h-4 w-4 mr-1.5" />
                      Dashboard
                    </Button>
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen)
              }}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="min-h-[44px] flex items-center px-3 rounded-lg text-muted-foreground hover:text-forest-500 hover:bg-muted font-medium transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false)
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  {dashboardUrl && (
                    <Link
                      href={dashboardUrl}
                      onClick={() => {
                        setMobileMenuOpen(false)
                      }}
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <LayoutDashboard className="h-4 w-4 mr-1.5" />
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOut()
                    }}
                    className="min-h-[44px] flex items-center gap-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
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
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
