import { prisma } from '@/lib/prisma'
import { assertOwner } from '@/lib/auth/guards'
import { format } from 'date-fns'
import NotificationLogTable from '@/components/owner/NotificationLogTable'

export const dynamic = 'force-dynamic'

export default async function NotificationLogsPage() {
  await assertOwner()

  const logs = await prisma.notificationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Logs</h1>
        <p className="text-muted-foreground">Recent email and SMS notifications</p>
      </div>

      <NotificationLogTable
        logs={logs.map((log) => ({
          id: log.id,
          event: log.event,
          recipient: log.recipient,
          channel: log.channel,
          subject: log.subject ?? '',
          status: log.status,
          error: log.error,
          createdAt: format(log.createdAt, 'MMM d, yyyy h:mm a'),
        }))}
      />
    </div>
  )
}
