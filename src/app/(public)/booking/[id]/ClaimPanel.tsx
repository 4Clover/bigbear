'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ClaimPanelProps {
  bookingId: string
  token: string
  holdExpiresAt: string
  alreadyClaimed: boolean
}

interface ClaimResponse {
  success?: boolean
  error?: string
}

const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours)}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

export const ClaimPanel = ({
  bookingId,
  token,
  holdExpiresAt,
  alreadyClaimed,
}: ClaimPanelProps) => {
  const [claimed, setClaimed] = useState(alreadyClaimed)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Countdown only ticks after mount — SSR renders the static expiry time so
  // the server and client markup match on hydration. The first tick lands a
  // second after mount; until then the static label shows.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const expiresAtMs = new Date(holdExpiresAt).getTime()
  const expiresAtLabel = new Date(holdExpiresAt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const handleClaim = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/booking/${bookingId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = (await response.json()) as ClaimResponse
      if (response.ok && data.success) {
        setClaimed(true)
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (claimed) {
    return (
      <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 dark:border-forest-800 dark:bg-forest-900/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest-600 dark:text-forest-400" />
          <div>
            <p className="font-medium text-forest-700 dark:text-forest-300">
              Thanks — we&apos;ve noted your payment
            </p>
            <p className="mt-1 text-sm text-forest-600 dark:text-forest-400">
              The owner will verify the funds and confirm your booking. You&apos;ll get a
              confirmation email once that&apos;s done.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {now === null
          ? `This hold expires ${expiresAtLabel}.`
          : `This hold expires in ${formatRemaining(expiresAtMs - now)} (${expiresAtLabel}).`}
      </p>
      <Button
        className="w-full"
        onClick={() => void handleClaim()}
        isLoading={isSubmitting}
        disabled={now !== null && expiresAtMs - now <= 0}
      >
        I&apos;ve sent the payment
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
