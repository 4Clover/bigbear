import { TreePine } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <TreePine className="h-12 w-12 text-forest-500" />
        </Link>
        <h2 className="mt-4 text-center text-2xl font-bold text-foreground">Grizzly Getaway</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card text-card-foreground py-8 px-4 shadow-lg border border-border sm:rounded-xl sm:px-10">
          {children}
        </div>
      </div>
    </div>
  )
}
