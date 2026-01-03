import Link from 'next/link'
import { Button } from '@/components/ui'

export default function VerifyPage() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
      <p className="text-gray-600 mb-6">
        We&apos;ve sent a magic link to your email address. Click the link in the email to sign in.
      </p>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-500">
          The link will expire in 10 minutes. If you don&apos;t see the email, check your spam folder.
        </p>
      </div>

      <Link href="/login">
        <Button variant="outline">Try a different email</Button>
      </Link>
    </div>
  )
}
