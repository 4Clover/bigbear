'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState, type SyntheticEvent } from 'react'
import { Button, Input } from '@/components/ui'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginForm() {
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get('callbackUrl')
  const callbackUrl = rawCallbackUrl?.startsWith('/') ? rawCallbackUrl : '/'
  const authError = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    OAuthSignin: 'Could not start Google sign-in. Please try again.',
    OAuthCallback: 'Google sign-in failed. Please try again.',
    OAuthAccountNotLinked: 'This email is already linked to another sign-in method.',
    AccessDenied: 'Access denied. Your Google account is not authorized.',
    default: 'Something went wrong with sign-in. Please try again.',
  }

  const oauthErrorMessage = authError ? (errorMessages[authError] ?? errorMessages.default) : null

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('resend', {
        email,
        redirect: false,
        callbackUrl,
      })

      if (result.error) {
        setError('Failed to send magic link. Please try again.')
      } else {
        window.location.href = '/verify'
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-foreground text-center mb-6">
        Sign in to your account
      </h3>

      <div className="space-y-4">
        {oauthErrorMessage && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
            {oauthErrorMessage}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setIsGoogleLoading(true)
            void signIn('google', { callbackUrl })
          }}
          type="button"
          isLoading={isGoogleLoading}
        >
          {!isGoogleLoading && <GoogleIcon className="w-5 h-5 mr-2" />}
          Sign in with Google
        </Button>
      </div>

      <div className="my-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">or continue with email</span>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
          }}
          placeholder="you@example.com"
          required
          error={error}
        />

        <Button type="submit" isLoading={isLoading} className="w-full">
          Send Magic Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sign in with Google above, or enter your email for a magic link - no password required.
      </p>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-forest-600 dark:text-forest-400 hover:underline">
          &larr; Back to home
        </Link>
      </div>
    </div>
  )
}
