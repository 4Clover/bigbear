import Stripe from 'stripe'
import { env } from './env'

const getStripeClient = () => {
  const secretKey = env().STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia',
  })
}

// Lazy-load the Stripe client to avoid build-time errors
let _stripe: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    _stripe ??= getStripeClient()
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop]
  },
})
