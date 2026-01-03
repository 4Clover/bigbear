import Stripe from 'stripe'

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
  })
}

// Lazy-load the Stripe client to avoid build-time errors
let _stripe: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = getStripeClient()
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop]
  },
})
