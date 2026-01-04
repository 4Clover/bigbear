'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('resend', {
        email,
        redirect: false,
        callbackUrl: '/',
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
      <h3 className="text-lg font-medium text-gray-900 text-center mb-6">
        Sign in to your account
      </h3>

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

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">No password needed</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        We&apos;ll send a magic link to your email. Click the link to sign in - no password
        required!
      </p>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-emerald-600 hover:underline">
          &larr; Back to home
        </Link>
      </div>
    </div>
  )
}
