import { prisma } from '@/lib/prisma'
import { NotificationEvent } from '@prisma/client'
import NotificationPreferencesForm from '@/components/owner/NotificationPreferencesForm'

const eventLabels: Record<NotificationEvent, { label: string; description: string }> = {
  BOOKING_REQUEST: {
    label: 'Booking Request',
    description: 'When a new booking request is submitted',
  },
  BOOKING_CONFIRMED: {
    label: 'Booking Confirmed',
    description: 'When a booking is confirmed',
  },
  BOOKING_CANCELLED: {
    label: 'Booking Cancelled',
    description: 'When a booking is cancelled',
  },
  PAYMENT_RECEIVED: {
    label: 'Payment Received',
    description: 'When a payment is successfully processed',
  },
  PAYMENT_FAILED: {
    label: 'Payment Failed',
    description: 'When a payment fails',
  },
  GUEST_CHECKIN_REMINDER: {
    label: 'Check-in Reminder',
    description: 'Reminder before guest check-in',
  },
  GUEST_CHECKOUT_REMINDER: {
    label: 'Check-out Reminder',
    description: 'Reminder before guest check-out',
  },
  MAINTENANCE_QUOTE_RECEIVED: {
    label: 'Maintenance Quote',
    description: 'When a worker submits a maintenance quote',
  },
  MAINTENANCE_COMPLETED: {
    label: 'Maintenance Completed',
    description: 'When maintenance work is completed',
  },
  NEW_MESSAGE: {
    label: 'New Message',
    description: 'When a new message is received',
  },
}

const getNotificationPreferences = async () => {
  const preferences = await prisma.notificationPreference.findMany({
    orderBy: { event: 'asc' },
  })

  // Create a map of existing preferences
  const prefsMap = new Map(preferences.map((p) => [p.event, p]))

  // Ensure all events have a preference (with defaults)
  const allEvents = Object.values(NotificationEvent)
  const completePreferences = allEvents.map((event) => {
    const existing = prefsMap.get(event)
    return (
      existing ?? {
        id: `temp-${event}`,
        event,
        emailEnabled: true,
        smsEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    )
  })

  return completePreferences
}

const SettingsPage = async () => {
  const preferences = await getNotificationPreferences()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your notification preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose how you want to be notified about different events.
        </p>

        <NotificationPreferencesForm preferences={preferences} eventLabels={eventLabels} />
      </div>
    </div>
  )
}

export default SettingsPage
