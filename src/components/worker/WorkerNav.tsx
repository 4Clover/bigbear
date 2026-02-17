'use client'

import { ArrowLeft, Briefcase, Calendar, FileText, LogOut, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { LucideIcon } from 'lucide-react'

interface WorkerNavProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/worker/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/worker/quotes', label: 'My Quotes', icon: FileText },
  { href: '/worker/schedule', label: 'Schedule', icon: Calendar },
]

const WorkerNav = ({ user }: WorkerNavProps) => {
  const pathname = usePathname()

  const handleSignOut = () => {
    void signOut({ callbackUrl: '/' })
  }

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/worker/jobs" className="flex items-center gap-2">
          <Wrench className="h-8 w-8 text-wood-500" />
          <span className="text-lg font-bold text-foreground">Worker Portal</span>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-wood-100 text-wood-700 dark:bg-wood-900 dark:text-wood-300'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-wood-100 dark:bg-wood-900 rounded-full flex items-center justify-center">
              <span className="text-wood-700 dark:text-wood-300 font-medium text-sm">
                {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'W'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name ?? 'Worker'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
        <Link
          href="/"
          className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Homepage</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full mt-1 flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

export default WorkerNav
