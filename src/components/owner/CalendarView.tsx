'use client'

import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useState, useMemo } from 'react'
import type { Booking, BlockedDate } from '@prisma/client'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'booking' | 'blocked'
  status?: string
  resource?: Booking | BlockedDate
}

interface CalendarViewProps {
  bookings: Booking[]
  blockedDates: BlockedDate[]
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  onSelectEvent?: (event: CalendarEvent) => void
}

const eventStyleGetter = (event: CalendarEvent) => {
  let backgroundColor = '#10b981' // emerald for confirmed
  let borderColor = '#059669'

  if (event.type === 'blocked') {
    backgroundColor = '#6b7280'
    borderColor = '#4b5563'
  } else if (event.status === 'PENDING') {
    backgroundColor = '#f59e0b'
    borderColor = '#d97706'
  } else if (event.status === 'CANCELLED') {
    backgroundColor = '#ef4444'
    borderColor = '#dc2626'
  } else if (event.status === 'COMPLETED') {
    backgroundColor = '#3b82f6'
    borderColor = '#2563eb'
  }

  return {
    style: {
      backgroundColor,
      borderColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: `1px solid ${borderColor}`,
    },
  }
}

const CalendarView = ({
  bookings,
  blockedDates,
  onSelectSlot,
  onSelectEvent,
}: CalendarViewProps) => {
  const [view, setView] = useState<(typeof Views)[keyof typeof Views]>(Views.MONTH)
  const [date, setDate] = useState(new Date())

  const events = useMemo<CalendarEvent[]>(() => {
    const bookingEvents: CalendarEvent[] = bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.guestName} (${booking.status})`,
      start: new Date(booking.checkIn),
      end: new Date(booking.checkOut),
      type: 'booking',
      status: booking.status,
      resource: booking,
    }))

    const blockedEvents: CalendarEvent[] = blockedDates.map((blocked) => ({
      id: blocked.id,
      title: blocked.reason ?? 'Blocked',
      start: new Date(blocked.startDate),
      end: new Date(blocked.endDate),
      type: 'blocked',
      resource: blocked,
    }))

    return [...bookingEvents, ...blockedEvents]
  }, [bookings, blockedDates])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .rbc-toolbar button {
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
        .rbc-toolbar button:hover {
          background-color: #f3f4f6;
        }
        .rbc-toolbar button.rbc-active {
          background-color: #10b981;
          color: white;
          border-color: #10b981;
        }
        .rbc-header {
          padding: 0.5rem;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }
        .rbc-today {
          background-color: #ecfdf5;
        }
        .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .rbc-date-cell {
          padding: 0.25rem 0.5rem;
          text-align: right;
        }
        .rbc-event {
          font-size: 0.75rem;
          padding: 2px 4px;
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
      />
      <div className="mt-4 pt-4 border-t border-stone-100">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-stone-700">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-stone-700">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-stone-700">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-stone-500" />
            <span className="text-stone-700">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-stone-700">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarView
