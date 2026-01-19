import { Suspense } from 'react'
import { BookingContent } from './BookingContent'

export const metadata = {
  title: 'Book Your Stay',
  description: 'Reserve your mountain getaway at Big Bear Cabin.',
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-foreground">Book Your Stay</h1>
            <p className="text-muted-foreground">Loading booking form...</p>
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  )
}
