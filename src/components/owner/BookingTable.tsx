'use client'

import { format } from 'date-fns'
import type { Booking } from '@prisma/client'
import { useState, useTransition } from 'react'
import {
  approveBookingRequest,
  rejectBookingRequest,
  cancelBooking,
} from '@/actions/bookings'

interface BookingTableProps {
  bookings: Booking[]
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings found</h3>
        <p className="mt-2 text-gray-500">
          No bookings match your current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => {
              const isActionPending = isPending && actionId === booking.id
              return (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {booking.guestName}
                      </div>
                      <div className="text-sm text-gray-500">{booking.guestEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(booking.checkIn, 'MMM d')} - {format(booking.checkOut, 'MMM d')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(booking.checkIn, 'yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.numberOfGuests}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(booking.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[booking.status] ?? ''}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      {booking.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => { handleApprove(booking.id) }}
                            disabled={isActionPending}
                            className="text-emerald-600 hover:text-emerald-900 font-medium disabled:opacity-50"
                          >
                            {isActionPending ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { handleReject(booking.id) }}
                            disabled={isActionPending}
                            className="text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => { handleCancel(booking.id) }}
                          disabled={isActionPending}
                          className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
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
