'use client'

interface NotificationLog {
  id: string
  event: string
  recipient: string
  channel: string
  subject: string
  status: string
  error: string | null
  createdAt: string
}

interface NotificationLogTableProps {
  logs: NotificationLog[]
}

export default function NotificationLogTable({ logs }: NotificationLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No notification logs found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Channel</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Recipient</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Subject</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b hover:bg-muted/30">
              <td className="px-4 py-3 text-sm whitespace-nowrap">{log.createdAt}</td>
              <td className="px-4 py-3 text-sm">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {log.event.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    log.channel === 'email'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {log.channel}
                </span>
              </td>
              <td className="px-4 py-3 text-sm truncate max-w-[200px]" title={log.recipient}>
                {log.recipient}
              </td>
              <td className="px-4 py-3 text-sm truncate max-w-[200px]" title={log.subject}>
                {log.subject || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                {log.status === 'sent' ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    Sent
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 cursor-help"
                    title={log.error ?? 'Unknown error'}
                  >
                    Failed
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
