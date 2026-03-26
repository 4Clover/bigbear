'use client'

import { useState } from 'react'
import { X, Send, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BookingDetails {
  checkIn: Date
  checkOut: Date
  guestName: string
  guestEmail: string
  guestPhone: string
  totalAmount: number
}

interface PaymentOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingDetails
}

interface PaymentOption {
  id: string
  name: string
  handle: string
  color: string
  icon: string
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'venmo', name: 'Venmo', handle: '@GrizzlyGetaway', color: 'bg-[#3D95CE]', icon: 'V' },
  { id: 'cashapp', name: 'Cash App', handle: '$GrizzlyGetaway', color: 'bg-[#00D632]', icon: '$' },
  {
    id: 'paypal',
    name: 'PayPal',
    handle: 'pay@grizzlygetaway.com',
    color: 'bg-[#003087]',
    icon: 'P',
  },
  {
    id: 'zelle',
    name: 'Zelle',
    handle: 'pay@grizzlygetaway.com',
    color: 'bg-[#6D1ED4]',
    icon: 'Z',
  },
]

interface InquiryResponse {
  success?: boolean
  error?: string
}

export const PaymentOptionsModal = ({ isOpen, onClose, booking }: PaymentOptionsModalProps) => {
  const [showContactForm, setShowContactForm] = useState(false)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isOpen) return null

  const formattedTotal = `$${booking.totalAmount.toFixed(2)}`
  const nights = Math.ceil(
    (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  )

  const handleSendInquiry = async () => {
    if (!message.trim()) return
    setIsSending(true)

    try {
      const response = await fetch('/api/booking/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          checkIn: booking.checkIn.toISOString(),
          checkOut: booking.checkOut.toISOString(),
          totalAmount: booking.totalAmount,
          message,
        }),
      })

      const data = (await response.json()) as InquiryResponse
      if (data.success) {
        setSent(true)
      } else {
        alert(data.error ?? 'Failed to send. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setShowContactForm(false)
    setMessage('')
    setSent(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleClose()
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Choose Payment Method</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {nights} night{nights > 1 ? 's' : ''} &middot; {formattedTotal} total
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Send {formattedTotal} to any of the following. Include your name and dates in the
            payment note. You&apos;ll receive a confirmation email once payment is verified.
          </p>

          {/* Payment options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_OPTIONS.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-forest-400 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full ${option.color} text-white flex items-center justify-center font-bold text-lg shrink-0`}
                >
                  {option.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground text-sm">{option.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{option.handle}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border" />
            <span className="px-3 text-sm text-muted-foreground">or</span>
            <div className="flex-grow border-t border-border" />
          </div>

          {/* Contact Owner */}
          {!showContactForm ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowContactForm(true)
              }}
            >
              Contact Owner About Payment
            </Button>
          ) : sent ? (
            <div className="p-4 bg-forest-50 dark:bg-forest-900/30 rounded-lg border border-forest-200 dark:border-forest-800">
              <p className="font-medium text-forest-700 dark:text-forest-300">Message sent!</p>
              <p className="text-sm text-forest-600 dark:text-forest-400 mt-1">
                The owner will get back to you at {booking.guestEmail}. Check your email for
                updates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="inquiry-message"
                className="block text-sm font-medium text-foreground"
              >
                Message to owner
              </label>
              <textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                }}
                placeholder="Questions about payment, special arrangements, or anything else..."
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 resize-none"
                maxLength={2000}
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactForm(false)
                    setMessage('')
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => void handleSendInquiry()}
                  isLoading={isSending}
                  disabled={!message.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Send Message
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
