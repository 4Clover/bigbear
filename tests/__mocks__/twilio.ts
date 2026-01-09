import { vi } from 'vitest'

export const mockCreate = vi.fn().mockResolvedValue({ sid: 'mock-sms-sid' })

export const mockTwilio = vi.fn().mockReturnValue({
  messages: { create: mockCreate },
})

export const resetTwilioMocks = () => {
  mockCreate.mockReset()
  mockCreate.mockResolvedValue({ sid: 'mock-sms-sid' })
}

export default mockTwilio
