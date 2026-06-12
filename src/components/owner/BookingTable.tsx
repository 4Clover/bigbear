'use client'

import { format } from 'date-fns'
import { BadgeCheck, Calendar, Mail } from 'lucide-react'
import type { Booking, BookingStatus } from '@prisma/client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { approveBookingRequest, rejectBookingRequest, cancelBooking } from '@/actions/bookings'
import { sendReviewInvite } from '@/actions/reviews'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PAYMENT_METHOD_INFO } from '@/lib/payment-methods'

interface BookingTableProps {
  bookings: Booking[]
}

const statusColors: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-forest-100 text-forest-800 dark:bg-forest-900/30 dark:text-forest-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  COMPLETED: 'bg-wood-100 text-wood-800 dark:bg-wood-900/30 dark:text-wood-400',
  NO_SHOW: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
}

const BookingTable = ({ bookings }: BookingTableProps) => {
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = (id: string) => {
    setActionId(id)
    startTransition(async () => {
      try {
        await approveBookingRequest(id)
      } catch (error) {
        console.error('Failed to approve booking:', error)
        toast.error('Failed to approve booking')
      }
      setActionId(null)
    })
  }

  const handleReject = (id: string, reason: string) => {
    setActionId(id)
    startTransition(async () => {
      try {
        await rejectBookingRequest(id, reason.trim() === '' ? undefined : reason.trim())
      } catch (error) {
        console.error('Failed to reject booking:', error)
        toast.error('Failed to reject booking')
      }
      setActionId(null)
    })
  }

  const handleCancel = (id: string) => {
    setActionId(id)
    startTransition(async () => {
      try {
        await cancelBooking(id, 'owner')
      } catch (error) {
        console.error('Failed to cancel booking:', error)
        toast.error('Failed to cancel booking')
      }
      setActionId(null)
    })
  }

  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set())

  const handleSendReviewInvite = (id: string) => {
    setActionId(id)
    startTransition(async () => {
      try {
        const result = await sendReviewInvite({ bookingId: id })
        if (result.success) {
          setSentInvites((prev) => new Set(prev).add(id))
        } else {
          toast.error(result.error ?? 'Failed to send review invite')
        }
      } catch (error) {
        console.error('Failed to send review invite:', error)
        toast.error('Failed to send review invite')
      }
      setActionId(null)
    })
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">No bookings found</h3>
        <p className="mt-2 text-muted-foreground">No bookings match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Guest
              </th>
              <th className="px-2 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Dates
              </th>
              <th className="hidden md:table-cell px-2 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Guests
              </th>
              <th className="hidden md:table-cell px-2 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </th>
              <th className="hidden md:table-cell px-2 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Payment
              </th>
              <th className="px-2 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 py-3 md:px-6 md:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {bookings.map((booking) => {
              const isActionPending = isPending && actionId === booking.id
              return (
                <tr key={booking.id} className="hover:bg-muted/50">
                  <td className="px-2 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">{booking.guestName}</div>
                      <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                    </div>
                  </td>
                  <td className="px-2 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {format(booking.checkIn, 'MMM d')} - {format(booking.checkOut, 'MMM d')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(booking.checkIn, 'yyyy')}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-2 py-3 md:px-6 md:py-4 whitespace-nowrap text-sm text-foreground">
                    {booking.numberOfGuests}
                  </td>
                  <td className="hidden md:table-cell px-2 py-3 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    ${Number(booking.totalAmount).toLocaleString()}
                  </td>
                  <td className="hidden md:table-cell px-2 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {PAYMENT_METHOD_INFO[booking.paymentMethod].name}
                    </div>
                    {booking.paymentClaimedAt !== null && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-0.5 text-xs font-medium text-forest-800 dark:bg-forest-900/30 dark:text-forest-400">
                        <BadgeCheck className="h-3 w-3" />
                        guest claims paid
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[booking.status]}`}
                    >
                      {booking.status}
                    </span>
                    {booking.status === 'PENDING' && booking.holdExpiresAt !== null && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Hold expires {format(booking.holdExpiresAt, 'MMM d, h:mm a')}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 md:px-6 md:py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      {booking.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              handleApprove(booking.id)
                            }}
                            disabled={isActionPending}
                            className="text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300 font-medium disabled:opacity-50"
                          >
                            {isActionPending ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              setRejectReason('')
                              setRejectTargetId(booking.id)
                            }}
                            disabled={isActionPending}
                            className="text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => {
                            setCancelTargetId(booking.id)
                          }}
                          disabled={isActionPending}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
                        >
                          {isActionPending ? '...' : 'Cancel'}
                        </button>
                      )}
                      {booking.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            handleSendReviewInvite(booking.id)
                          }}
                          disabled={isActionPending || sentInvites.has(booking.id)}
                          className="inline-flex items-center gap-1 text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300 font-medium disabled:opacity-50"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {sentInvites.has(booking.id)
                            ? 'Sent'
                            : isActionPending
                              ? '...'
                              : 'Review Invite'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTargetId(null)
        }}
        title="Cancel this booking?"
        description="This may trigger a refund for the guest. This action cannot be undone."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        variant="destructive"
        onConfirm={() => {
          if (cancelTargetId) handleCancel(cancelTargetId)
        }}
      />

      <ConfirmDialog
        open={rejectTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTargetId(null)
        }}
        title="Reject this booking request?"
        description="The guest will be notified. You can include an optional reason below."
        confirmLabel="Reject"
        onConfirm={() => {
          if (rejectTargetId) handleReject(rejectTargetId, rejectReason)
        }}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => {
            setRejectReason(e.target.value)
          }}
          placeholder="Reason for rejection (optional)"
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 resize-none"
        />
      </ConfirmDialog>
    </div>
  )
}

export default BookingTable
