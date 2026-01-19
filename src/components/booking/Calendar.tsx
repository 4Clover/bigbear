'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns'

interface CalendarProps {
  checkIn: Date | null
  checkOut: Date | null
  onDateSelect: (checkIn: Date | null, checkOut: Date | null) => void
  blockedDates?: Date[]
  minNights?: number
  maxNights?: number
}

export const Calendar = ({
  checkIn,
  checkOut,
  onDateSelect,
  blockedDates = [],
  minNights = 2,
  maxNights = 14,
}: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))

  // Derive selectingCheckOut from props - if checkIn exists but checkOut doesn't
  const selectingCheckOut = checkIn !== null && checkOut === null

  const today = startOfDay(new Date())

  const isBlocked = useCallback(
    (date: Date) => {
      return blockedDates.some((blocked) => isSameDay(blocked, date))
    },
    [blockedDates]
  )

  const isDateDisabled = useCallback(
    (date: Date) => {
      if (isBefore(date, today)) return true
      if (isBlocked(date)) return true
      return false
    },
    [today, isBlocked]
  )

  const isInRange = useCallback(
    (date: Date) => {
      if (!checkIn || !checkOut) return false
      return isAfter(date, checkIn) && isBefore(date, checkOut)
    },
    [checkIn, checkOut]
  )

  const handleDateClick = useCallback(
    (date: Date) => {
      if (isDateDisabled(date)) return

      if (!selectingCheckOut) {
        // Starting fresh or selecting check-in
        onDateSelect(date, null)
      } else {
        // Selecting check-out
        if (isBefore(date, checkIn)) {
          // User clicked before check-in, reset to new check-in
          onDateSelect(date, null)
        } else {
          const nights = Math.ceil((date.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
          if (nights >= minNights && nights <= maxNights) {
            onDateSelect(checkIn, date)
          }
        }
      }
    },
    [checkIn, selectingCheckOut, onDateSelect, isDateDisabled, minNights, maxNights]
  )

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <button
        type="button"
        onClick={() => {
          setCurrentMonth(subMonths(currentMonth, 1))
        }}
        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h3 className="text-lg font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</h3>
      <button
        type="button"
        onClick={() => {
          setCurrentMonth(addMonths(currentMonth, 1))
        }}
        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day
        const disabled = isDateDisabled(currentDay)
        const isSelected =
          Boolean(checkIn && isSameDay(currentDay, checkIn)) ||
          Boolean(checkOut && isSameDay(currentDay, checkOut))
        const inRange = isInRange(currentDay)
        const isCurrentMonth = isSameMonth(currentDay, monthStart)

        days.push(
          <button
            key={currentDay.toString()}
            type="button"
            onClick={() => {
              handleDateClick(currentDay)
            }}
            disabled={disabled}
            className={`
              aspect-square p-2 text-sm rounded-lg transition-colors
              ${!isCurrentMonth ? 'text-stone-300 dark:text-stone-600' : 'text-foreground'}
              ${disabled ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed' : 'hover:bg-forest-100 dark:hover:bg-forest-900/30'}
              ${isSelected ? 'bg-forest-600 text-white hover:bg-forest-700' : ''}
              ${inRange ? 'bg-forest-100 dark:bg-forest-900/30' : ''}
            `}
          >
            {format(currentDay, 'd')}
          </button>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      )
      days = []
    }

    return <div className="space-y-1">{rows}</div>
  }

  return (
    <div className="bg-card p-4 rounded-xl border border-border">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        {selectingCheckOut
          ? `Select check-out date (${minNights}-${maxNights} nights)`
          : 'Select check-in date'}
      </div>
    </div>
  )
}
