'use client'

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

interface AddonSelectorProps {
  addons: Addon[]
  selectedAddons: SelectedAddon[]
  onChange: (addons: SelectedAddon[]) => void
}

export const AddonSelector = ({ addons, selectedAddons, onChange }: AddonSelectorProps) => {
  const getQuantity = (addonId: string) => {
    const selected = selectedAddons.find((a) => a.id === addonId)
    return selected?.quantity ?? 0
  }

  const updateQuantity = (addonId: string, quantity: number) => {
    if (quantity <= 0) {
      onChange(selectedAddons.filter((a) => a.id !== addonId))
    } else {
      const existing = selectedAddons.find((a) => a.id === addonId)
      if (existing) {
        onChange(selectedAddons.map((a) => (a.id === addonId ? { ...a, quantity } : a)))
      } else {
        onChange([...selectedAddons, { id: addonId, quantity }])
      }
    }
  }

  if (addons.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Optional Add-ons</h3>
      <div className="space-y-3">
        {addons.map((addon) => {
          const quantity = getQuantity(addon.id)
          return (
            <div
              key={addon.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <div className="font-medium">{addon.name}</div>
                {addon.description && (
                  <div className="text-sm text-gray-500">{addon.description}</div>
                )}
                <div className="text-sm font-semibold text-emerald-600">
                  ${addon.price.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateQuantity(addon.id, quantity - 1)
                  }}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors disabled:opacity-50"
                  disabled={quantity === 0}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    updateQuantity(addon.id, quantity + 1)
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
