'use client'

import { useTransition, useOptimistic } from 'react'
import { updateNotificationPreference } from '@/actions/notifications'
import type { NotificationEvent, NotificationPreference } from '@prisma/client'

interface NotificationPreferencesFormProps {
  preferences: NotificationPreference[]
  eventLabels: Record<NotificationEvent, { label: string; description: string }>
}

const NotificationPreferencesForm = ({
  preferences,
  eventLabels,
}: NotificationPreferencesFormProps) => {
  const [isPending, startTransition] = useTransition()
  const [optimisticPrefs, setOptimisticPrefs] = useOptimistic(preferences)

  const handleToggle = (
    event: NotificationEvent,
    field: 'emailEnabled' | 'smsEnabled',
    currentValue: boolean
  ) => {
    const pref = optimisticPrefs.find((p) => p.event === event)
    if (!pref) return

    const newEmailEnabled = field === 'emailEnabled' ? !currentValue : pref.emailEnabled
    const newSmsEnabled = field === 'smsEnabled' ? !currentValue : pref.smsEnabled

    // Optimistic update
    setOptimisticPrefs((prev) =>
      prev.map((p) =>
        p.event === event
          ? { ...p, emailEnabled: newEmailEnabled, smsEnabled: newSmsEnabled }
          : p
      )
    )

    startTransition(async () => {
      try {
        await updateNotificationPreference(event, newEmailEnabled, newSmsEnabled)
      } catch (error) {
        console.error('Failed to update preference:', error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,80px,80px] gap-4 pb-2 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-500">Event</div>
        <div className="text-sm font-medium text-gray-500 text-center">Email</div>
        <div className="text-sm font-medium text-gray-500 text-center">SMS</div>
      </div>

      {optimisticPrefs.map((pref) => {
        const eventInfo = eventLabels[pref.event]
        return (
          <div
            key={pref.event}
            className="grid grid-cols-[1fr,80px,80px] gap-4 py-3 border-b border-gray-100 last:border-0"
          >
            <div>
              <p className="font-medium text-gray-900">{eventInfo.label}</p>
              <p className="text-sm text-gray-500">{eventInfo.description}</p>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => { handleToggle(pref.event, 'emailEnabled', pref.emailEnabled) }}
                disabled={isPending}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  pref.emailEnabled ? 'bg-emerald-500' : 'bg-gray-200'
                } ${isPending ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    pref.emailEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => { handleToggle(pref.event, 'smsEnabled', pref.smsEnabled) }}
                disabled={isPending}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  pref.smsEnabled ? 'bg-emerald-500' : 'bg-gray-200'
                } ${isPending ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    pref.smsEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )
      })}

      <p className="text-xs text-gray-400 mt-4">
        Changes are saved automatically.
      </p>
    </div>
  )
}

export default NotificationPreferencesForm
