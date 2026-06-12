'use client'

import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { PAYMENT_METHOD_INFO } from '@/lib/payment-methods'

interface SelectedAddon {
  id: string
  quantity: number
}

interface BookingDetails {
  checkIn: Date
  checkOut: Date
  guestName: string
  guestEmail: string
  guestPhone: string
  totalAmount: number
  addons: SelectedAddon[]
}

interface PaymentOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingDetails
}

type AltPaymentMethod = 'VENMO' | 'CASHAPP' | 'PAYPAL' | 'ZELLE' | 'CONTACT_OWNER'

// Visual treatment per tile — names and handles come from PAYMENT_METHOD_INFO
const TILE_STYLES: {
  method: Exclude<AltPaymentMethod, 'CONTACT_OWNER'>
  color: string
  icon: string
}[] = [
  { method: 'VENMO', color: 'bg-[#3D95CE]', icon: 'V' },
  { method: 'CASHAPP', color: 'bg-[#00D632]', icon: '$' },
  { method: 'PAYPAL', color: 'bg-[#003087]', icon: 'P' },
  { method: 'ZELLE', color: 'bg-[#6D1ED4]', icon: 'Z' },
]

interface AltPaymentResponse {
  bookingId?: string
  holdExpiresAt?: string | null
  paymentMethod?: AltPaymentMethod
  methodInfo?: { name: string; handle: string }
  amountDue?: number
  error?: string
}

interface HoldResult {
  holdExpiresAt: string | null
  methodInfo: { name: string; handle: string }
  amountDue: number
  isContactOwner: boolean
}

export const PaymentOptionsModal = ({ isOpen, onClose, booking }: PaymentOptionsModalProps) => {
  const [showContactForm, setShowContactForm] = useState(false)
  const [message, setMessage] = useState('')
  const [submittingMethod, setSubmittingMethod] = useState<AltPaymentMethod | null>(null)
  const [holdResult, setHoldResult] = useState<HoldResult | null>(null)

  if (!isOpen) return null

  const formattedTotal = `$${booking.totalAmount.toFixed(2)}`
  const nights = Math.ceil(
    (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  )

  const submitHold = async (method: AltPaymentMethod) => {
    if (submittingMethod) return
    setSubmittingMethod(method)

    try {
      const response = await fetch('/api/booking/alt-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: booking.checkIn.toISOString(),
          checkOut: booking.checkOut.toISOString(),
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          addons: booking.addons,
          paymentMethod: method,
          ...(method === 'CONTACT_OWNER' ? { message } : {}),
        }),
      })

      const data = (await response.json()) as AltPaymentResponse
      if (response.ok && data.bookingId && data.methodInfo) {
        setHoldResult({
          holdExpiresAt: data.holdExpiresAt ?? null,
          methodInfo: data.methodInfo,
          amountDue: data.amountDue ?? booking.totalAmount,
          isContactOwner: method === 'CONTACT_OWNER',
        })
      } else {
        toast.error(data.error ?? 'Failed to hold your dates. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmittingMethod(null)
    }
  }

  const handleClose = () => {
    setShowContactForm(false)
    setMessage('')
    setHoldResult(null)
    onClose()
  }

  const holdExpiryLabel = holdResult?.holdExpiresAt
    ? new Date(holdResult.holdExpiresAt).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'in 24 hours'

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
            <h2 className="text-xl font-semibold text-foreground">
              {holdResult ? 'Dates Held!' : 'Choose Payment Method'}
            </h2>
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

        {holdResult ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-forest-50 dark:bg-forest-900/30 rounded-lg border border-forest-200 dark:border-forest-800">
              <p className="font-medium text-forest-700 dark:text-forest-300">
                Your dates are held until {holdExpiryLabel}.
              </p>
              {holdResult.isContactOwner ? (
                <p className="text-sm text-forest-600 dark:text-forest-400 mt-2">
                  The owner has received your message and will get back to you at{' '}
                  {booking.guestEmail} about payment.
                </p>
              ) : (
                <p className="text-sm text-forest-600 dark:text-forest-400 mt-2">
                  Send ${holdResult.amountDue.toFixed(2)} via {holdResult.methodInfo.name} to{' '}
                  <strong>{holdResult.methodInfo.handle}</strong>. Include your name and dates in
                  the payment note.
                </p>
              )}
              <p className="text-sm text-forest-600 dark:text-forest-400 mt-2">
                Check your email for the link to mark the payment as sent. The owner will verify the
                funds and confirm your booking.
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick a payment method and we&apos;ll hold your dates for 24 hours. Send{' '}
              {formattedTotal} with your name and dates in the payment note, and the owner will
              confirm once the funds arrive.
            </p>

            {/* Payment options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TILE_STYLES.map(({ method, color, icon }) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => void submitHold(method)}
                  disabled={submittingMethod !== null}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-forest-400 transition-colors text-left disabled:opacity-50"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center font-bold text-lg shrink-0`}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm">
                      {PAYMENT_METHOD_INFO[method].name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {PAYMENT_METHOD_INFO[method].handle}
                    </div>
                  </div>
                  {submittingMethod === method && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">Holding…</span>
                  )}
                </button>
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
                <p className="text-xs text-muted-foreground">
                  This also holds your dates for 24 hours while you and the owner sort out payment.
                </p>
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
                    onClick={() => void submitHold('CONTACT_OWNER')}
                    isLoading={submittingMethod === 'CONTACT_OWNER'}
                    disabled={!message.trim() || submittingMethod !== null}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Send Message
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
