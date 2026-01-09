import { vi } from 'vitest'

export const mockSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' })

export class MockResend {
  emails = { send: mockSend }
}

export const resetResendMocks = () => {
  mockSend.mockReset()
  mockSend.mockResolvedValue({ id: 'mock-email-id' })
}

// Named export for vi.mock
export const Resend = MockResend
