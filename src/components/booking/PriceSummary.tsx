interface Addon {
  id: string
  name: string
  price: number
}

interface SelectedAddon {
  id: string
  quantity: number
}

interface PriceSummaryProps {
  checkIn: Date | null
  checkOut: Date | null
  nightlyRate: number
  cleaningFee: number
  depositPercentage: number
  addons: Addon[]
  selectedAddons: SelectedAddon[]
}

export const PriceSummary = ({
  checkIn,
  checkOut,
  nightlyRate,
  cleaningFee,
  depositPercentage,
  addons,
  selectedAddons,
}: PriceSummaryProps) => {
  if (!checkIn || !checkOut) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Price Summary</h3>
        <p className="text-gray-500">Select dates to see pricing</p>
      </div>
    )
  }

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const accommodationTotal = nightlyRate * nights
  const addonsTotal = selectedAddons.reduce((total, selected) => {
    const addon = addons.find((a) => a.id === selected.id)
    return total + (addon ? addon.price * selected.quantity : 0)
  }, 0)
  const subtotal = accommodationTotal + cleaningFee + addonsTotal
  const deposit = subtotal * (depositPercentage / 100)
  const total = subtotal + deposit

  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Price Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span>
            ${nightlyRate.toFixed(2)} x {nights} night{nights > 1 ? 's' : ''}
          </span>
          <span>${accommodationTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cleaning fee</span>
          <span>${cleaningFee.toFixed(2)}</span>
        </div>
        {selectedAddons.length > 0 && (
          <>
            <hr className="border-gray-200" />
            {selectedAddons.map((selected) => {
              const addon = addons.find((a) => a.id === selected.id)
              if (!addon) return null
              return (
                <div key={selected.id} className="flex justify-between text-sm">
                  <span>
                    {addon.name} x {selected.quantity}
                  </span>
                  <span>${(addon.price * selected.quantity).toFixed(2)}</span>
                </div>
              )
            })}
          </>
        )}
        <hr className="border-gray-200" />
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Security deposit ({depositPercentage}%)</span>
          <span>${deposit.toFixed(2)}</span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        The security deposit is fully refundable based on our cancellation policy.
      </p>
    </div>
  )
}
