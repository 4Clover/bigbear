'use client'

import { useState } from 'react'
import CalendarView from '@/components/owner/CalendarView'
import BlockDateModal from '@/components/owner/BlockDateModal'
import CalendarSyncList from '@/components/owner/CalendarSyncList'
import type { Booking, BlockedDate, CalendarSync } from '@prisma/client'

interface CalendarPageClientProps {
  bookings: Booking[]
  blockedDates: BlockedDate[]
  calendarSyncs: CalendarSync[]
}

const CalendarPageClient = ({ bookings, blockedDates, calendarSyncs }: CalendarPageClientProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<BlockedDate | null>(null)

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedRange(slotInfo)
    setSelectedBlock(null)
    setModalOpen(true)
  }

  const handleSelectEvent = (event: { type: string; resource?: Booking | BlockedDate }) => {
    if (event.type === 'blocked' && event.resource) {
      setSelectedBlock(event.resource as BlockedDate)
      setSelectedRange(null)
      setModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedRange(null)
    setSelectedBlock(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CalendarView
            bookings={bookings}
            blockedDates={blockedDates}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
          />
        </div>
        <div>
          <CalendarSyncList syncs={calendarSyncs} />
        </div>
      </div>

      <BlockDateModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        selectedRange={selectedRange}
        existingBlock={selectedBlock}
      />
    </>
  )
}

export default CalendarPageClient
