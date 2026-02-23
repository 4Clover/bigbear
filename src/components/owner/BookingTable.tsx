'use client'

import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import type { Booking, BookingStatus } from '@prisma/client'
import { useState, useTransition } from 'react'
import { approveBookingRequest, rejectBookingRequest, cancelBooking } from '@/actions/bookings'

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

  const handleApprove = (id: string) => {
    setActionId(id)
    startTransition(async () => {
      try {
        await approveBookingRequest(id)
      } catch (error) {
        console.error('Failed to approve booking:', error)
        alert('Failed to approve booking')
      }
      setActionId(null)
    })
  }

  const handleReject = (id: string) => {
    const reason = prompt('Reason for rejection (optional):')
    setActionId(id)
    startTransition(async () => {
      try {
        await rejectBookingRequest(id, reason ?? undefined)
      } catch (error) {
        console.error('Failed to reject booking:', error)
        alert('Failed to reject booking')
      }
      setActionId(null)
    })
  }

  const handleCancel = (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This may trigger a refund.')) {
      return
    }
    setActionId(id)
    startTransition(async () => {
      try {
        await cancelBooking(id, 'owner')
      } catch (error) {
        console.error('Failed to cancel booking:', error)
        alert('Failed to cancel booking')
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
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Guest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Guests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {bookings.map((booking) => {
              const isActionPending = isPending && actionId === booking.id
              return (
                <tr key={booking.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">{booking.guestName}</div>
                      <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {format(booking.checkIn, 'MMM d')} - {format(booking.checkOut, 'MMM d')}
                    </div>
                    <div className="text-sm text-muted-foreground">{format(booking.checkIn, 'yyyy')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {booking.numberOfGuests}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    ${Number(booking.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[booking.status]}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
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
                              handleReject(booking.id)
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
                            handleCancel(booking.id)
                          }}
                          disabled={isActionPending}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
                        >
                          {isActionPending ? '...' : 'Cancel'}
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
    </div>
  )
}

export default BookingTable
