'use client'

import { useState } from 'react'
import { bookTimeslot } from '@/actions/maintenance'

interface TimeslotPickerProps {
  jobId: string
  jobTitle: string
  onSuccess: () => void
  onCancel: () => void
}

const timeSlots = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
]

const TimeslotPicker = ({ jobId, jobTitle, onSuccess, onCancel }: TimeslotPickerProps) => {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const minDate = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return

    setIsSubmitting(true)
    setError(null)

    try {
      await bookTimeslot({
        jobId,
        scheduledDate: new Date(selectedDate),
        scheduledTime: selectedTime,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book timeslot')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Schedule Work for: {jobTitle}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">
            Select Date *
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); }}
            min={minDate}
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Time *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => { setSelectedTime(time); }}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  selectedTime === time
                    ? 'bg-secondary text-secondary-foreground border-secondary'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {selectedDate && selectedTime && (
          <div className="p-3 bg-secondary/10 rounded-lg">
            <p className="text-sm text-secondary">
              <span className="font-medium">Scheduled for:</span>{' '}
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              at {selectedTime}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !selectedDate || !selectedTime}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default TimeslotPicker
