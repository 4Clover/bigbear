import { format } from 'date-fns'
import type { Booking, BookingStatus } from '@prisma/client'

interface BookingCardProps {
  booking: Booking
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onCancel?: (id: string) => void
  isLoading?: boolean
}

const statusColors: Record<BookingStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
  NO_SHOW: 'bg-gray-100 text-gray-800 border-gray-200',
}

const BookingCard = ({ booking, onApprove, onReject, onCancel, isLoading }: BookingCardProps) => {
  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{booking.guestName}</h3>
          <p className="text-sm text-gray-500">{booking.guestEmail}</p>
          {booking.guestPhone && <p className="text-sm text-gray-500">{booking.guestPhone}</p>}
        </div>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full border ${statusColors[booking.status] ?? ''}`}
        >
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
          <p className="font-medium text-gray-900">{format(booking.checkIn, 'EEE, MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
          <p className="font-medium text-gray-900">
            {format(booking.checkOut, 'EEE, MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
        <span>
          {nights} night{nights !== 1 ? 's' : ''}
        </span>
        <span>&bull;</span>
        <span>
          {booking.numberOfGuests} guest{booking.numberOfGuests !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">
            ${Number(booking.totalAmount).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2">
          {booking.status === 'PENDING' && (
            <>
              {onApprove && (
                <button
                  onClick={() => {
                    onApprove(booking.id)
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => {
                    onReject(booking.id)
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              )}
            </>
          )}
          {booking.status === 'CONFIRMED' && onCancel && (
            <button
              onClick={() => {
                onCancel(booking.id)
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {booking.specialRequests && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Special Requests</p>
          <p className="text-sm text-gray-700">{booking.specialRequests}</p>
        </div>
      )}
    </div>
  )
}

export default BookingCard
