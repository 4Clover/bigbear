import { Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function VerifyPage() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forest-100 dark:bg-forest-900 text-forest-600 dark:text-forest-400 mb-6">
        <Mail className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-medium text-foreground mb-2">Check your email</h3>
      <p className="text-muted-foreground mb-6">
        We&apos;ve sent a magic link to your email address. Click the link in the email to sign in.
      </p>

      <div className="bg-muted rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          The link will expire in 10 minutes. If you don&apos;t see the email, check your spam
          folder.
        </p>
      </div>

      <Link href="/login">
        <Button variant="outline">Try a different email</Button>
      </Link>
    </div>
  )
}
