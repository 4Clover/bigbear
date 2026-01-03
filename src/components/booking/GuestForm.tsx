'use client'

import { Input } from '@/components/ui'

interface GuestInfo {
  name: string
  email: string
  phone: string
}

interface GuestFormProps {
  guestInfo: GuestInfo
  onChange: (info: GuestInfo) => void
  errors?: Partial<Record<keyof GuestInfo, string>>
}

export const GuestForm = ({ guestInfo, onChange, errors = {} }: GuestFormProps) => {
  const handleChange = (field: keyof GuestInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...guestInfo, [field]: e.target.value })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Guest Information</h3>
      <Input
        label="Full Name"
        value={guestInfo.name}
        onChange={handleChange('name')}
        placeholder="John Doe"
        error={errors.name}
        required
      />
      <Input
        label="Email Address"
        type="email"
        value={guestInfo.email}
        onChange={handleChange('email')}
        placeholder="john@example.com"
        error={errors.email}
        required
      />
      <Input
        label="Phone Number"
        type="tel"
        value={guestInfo.phone}
        onChange={handleChange('phone')}
        placeholder="(555) 123-4567"
        error={errors.phone}
      />
    </div>
  )
}
