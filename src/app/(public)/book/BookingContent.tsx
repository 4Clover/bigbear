'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, GuestForm, AddonSelector, PriceSummary } from '@/components/booking'
import { Button, Card, CardContent } from '@/components/ui'

interface Addon {
  id: string
  name: string
  description: string | null
  price: number
}

interface SelectedAddon {
  id: string
  quantity: number
}

interface PricingConfig {
  baseNightlyRate: number
  cleaningFee: number
  depositPercentage: number
  minNights: number
  maxNights: number
}

interface GuestInfo {
  name: string
  email: string
  phone: string
}

interface CheckoutResponse {
  url?: string
  error?: string
}

export const BookingContent = () => {
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')

  const [checkIn, setCheckIn] = useState<Date | null>(null)
  const [checkOut, setCheckOut] = useState<Date | null>(null)
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '', phone: '' })
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [pricing, setPricing] = useState<PricingConfig | null>(null)
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({})
  const [availabilityError, setAvailabilityError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [addonsRes, pricingRes, blockedRes] = await Promise.all([
          fetch('/api/addons'),
          fetch('/api/pricing'),
          fetch('/api/availability'),
        ])

        if (addonsRes.ok) {
          const addonsData = (await addonsRes.json()) as Addon[]
          setAddons(addonsData)
        }

        if (pricingRes.ok) {
          const pricingData = (await pricingRes.json()) as PricingConfig
          setPricing(pricingData)
        }

        if (blockedRes.ok) {
          const blockedData = (await blockedRes.json()) as string[]
          setBlockedDates(blockedData.map((d) => new Date(d)))
          setAvailabilityError(false)
        } else {
          setAvailabilityError(true)
        }
      } catch (error) {
        console.error('Failed to fetch booking data:', error)
        setAvailabilityError(true)
      }
    }

    void fetchData()
  }, [])

  const handleDateSelect = (newCheckIn: Date | null, newCheckOut: Date | null) => {
    setCheckIn(newCheckIn)
    setCheckOut(newCheckOut)
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GuestInfo, string>> = {}

    if (!guestInfo.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!guestInfo.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!checkIn || !checkOut) {
      alert('Please select your dates')
      return
    }

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone,
          addons: selectedAddons,
        }),
      })

      const data = (await response.json()) as CheckoutResponse

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const defaultPricing: PricingConfig = {
    baseNightlyRate: 150,
    cleaningFee: 75,
    depositPercentage: 20,
    minNights: 2,
    maxNights: 14,
  }

  const config = pricing ?? defaultPricing

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Book Your Stay</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select your dates, provide your information, and complete your booking. We can&apos;t wait
          to host you!
        </p>
      </div>

      {cancelled && (
        <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200">
          Your booking was cancelled. Feel free to start over when you&apos;re ready.
        </div>
      )}

      {availabilityError && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <p className="font-semibold mb-1">Unable to Load Availability</p>
          <p className="text-sm">
            We couldn&apos;t load the current availability calendar. Please refresh the page to try
            again.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardContent className="py-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Select Dates</h2>
              <Calendar
                checkIn={checkIn}
                checkOut={checkOut}
                onDateSelect={handleDateSelect}
                blockedDates={blockedDates}
                minNights={config.minNights}
                maxNights={config.maxNights}
              />
              {checkIn && checkOut && (
                <div className="mt-4 p-3 bg-forest-50 dark:bg-forest-900/30 rounded-lg text-forest-700 dark:text-forest-300 text-sm">
                  {Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))}{' '}
                  nights selected
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <GuestForm guestInfo={guestInfo} onChange={setGuestInfo} errors={errors} />
            </CardContent>
          </Card>

          {addons.length > 0 && (
            <Card>
              <CardContent className="py-6">
                <AddonSelector
                  addons={addons}
                  selectedAddons={selectedAddons}
                  onChange={setSelectedAddons}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <PriceSummary
              checkIn={checkIn}
              checkOut={checkOut}
              nightlyRate={config.baseNightlyRate}
              cleaningFee={config.cleaningFee}
              depositPercentage={config.depositPercentage}
              addons={addons}
              selectedAddons={selectedAddons}
            />
            <Button
              onClick={() => void handleSubmit()}
              isLoading={isLoading}
              disabled={!checkIn || !checkOut || availabilityError}
              className="w-full"
              size="lg"
            >
              Proceed to Payment
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You will be redirected to Stripe for secure payment processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
