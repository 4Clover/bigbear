import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateExternalUrl } from '@/lib/security'
import ical from 'node-ical'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request): Promise<NextResponse> => {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = env().CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const syncs = await prisma.calendarSync.findMany({
    where: { isActive: true },
  })

  const results: { id: string; name: string; status: string }[] = []

  for (const sync of syncs) {
    try {
      // Validate URL to prevent SSRF attacks
      validateExternalUrl(sync.icalUrl)

      // Fetch with 30-second timeout
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => {
        controller.abort()
      }, 30_000)
      let icalText: string
      try {
        const response = await fetch(sync.icalUrl, { signal: controller.signal })
        icalText = await response.text()
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[CALENDAR-SYNC]', { event: 'fetch_timeout', url: sync.icalUrl })
        }
        throw err
      } finally {
        clearTimeout(fetchTimeout)
      }

      const events = await ical.async.parseICS(icalText)

      const eventsToSync: {
        startDate: Date
        endDate: Date
        reason: string
        source: string
        externalId: string
      }[] = []

      for (const [key, event] of Object.entries(events)) {
        if (event?.type !== 'VEVENT' || !event.end) continue

        const startDate = new Date(event.start)
        const endDate = new Date(event.end)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue

        eventsToSync.push({
          startDate,
          endDate,
          reason: `Imported from ${sync.name}`,
          source: sync.name,
          externalId: `sync-${sync.id}-${key}`,
        })
      }

      // Batch create new events (skips existing by externalId unique constraint)
      await prisma.blockedDate.createMany({
        data: eventsToSync,
        skipDuplicates: true,
      })

      // Batch update existing events in a single transaction
      if (eventsToSync.length > 0) {
        await prisma.$transaction(
          eventsToSync.map((evt) =>
            prisma.blockedDate.updateMany({
              where: { externalId: evt.externalId },
              data: { startDate: evt.startDate, endDate: evt.endDate },
            })
          )
        )
      }

      await prisma.calendarSync.update({
        where: { id: sync.id },
        data: {
          lastSynced: new Date(),
          lastError: null,
          syncCount: { increment: 1 },
        },
      })

      results.push({
        id: sync.id,
        name: sync.name,
        status: `success - ${eventsToSync.length} events`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await prisma.calendarSync.update({
        where: { id: sync.id },
        data: {
          lastError: errorMessage,
        },
      })

      results.push({
        id: sync.id,
        name: sync.name,
        status: `error: ${errorMessage}`,
      })

      console.error(`Calendar sync error for ${sync.name}:`, error)
    }
  }

  return NextResponse.json({
    synced: syncs.length,
    results,
  })
}
