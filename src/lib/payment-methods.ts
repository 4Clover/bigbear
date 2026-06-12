import type { PaymentMethod } from '@prisma/client'

export interface PaymentMethodInfo {
  /** Human-readable service name */
  name: string
  /** Account handle / address the guest sends funds to */
  handle: string
}

/**
 * Off-platform payment destinations shown on the payment modal and in
 * Hold-confirmation emails. STRIPE is dormant and CONTACT_OWNER has no
 * handle — both render as a plain label.
 */
export const PAYMENT_METHOD_INFO: Record<PaymentMethod, PaymentMethodInfo> = {
  STRIPE: { name: 'Card (Stripe)', handle: '' },
  VENMO: { name: 'Venmo', handle: '@GrizzlyGetaway' },
  CASHAPP: { name: 'Cash App', handle: '$GrizzlyGetaway' },
  PAYPAL: { name: 'PayPal', handle: 'pay@grizzlygetaway.com' },
  ZELLE: { name: 'Zelle', handle: 'pay@grizzlygetaway.com' },
  CONTACT_OWNER: { name: 'Contact Owner', handle: '' },
}

/** Hold lifetime for alt-payment bookings (ADR 0001) */
export const HOLD_DURATION_MS = 24 * 60 * 60 * 1000
