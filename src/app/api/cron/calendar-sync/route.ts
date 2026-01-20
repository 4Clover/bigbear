import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateExternalUrl } from '@/lib/security'
import ical from 'node-ical'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request): Promise<NextResponse> => {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
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

      const events = await ical.async.fromURL(sync.icalUrl)

      let eventsProcessed = 0

      // Process events and create blocked dates for external bookings
      for (const [key, event] of Object.entries(events)) {
        if (event.type !== 'VEVENT') continue

        const startDate = new Date(event.start)
        const endDate = new Date(event.end)

        // Skip invalid dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue

        // Create or update blocked date using externalId for tracking
        const externalId = `sync-${sync.id}-${key}`

        await prisma.blockedDate.upsert({
          where: { externalId },
          update: {
            startDate,
            endDate,
          },
          create: {
            startDate,
            endDate,
            reason: `Imported from ${sync.name}`,
            source: sync.name,
            externalId,
          },
        })

        eventsProcessed++
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
        status: `success - ${eventsProcessed} events`,
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
