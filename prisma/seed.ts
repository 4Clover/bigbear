import { config } from 'dotenv'
import { PrismaClient, type NotificationEvent } from '@prisma/client'

// Load env files in Next.js order (matching prisma.config.ts)
config({ path: '.env.local' })
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.development.local', override: true })
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Conditionally use Neon adapter only for Neon connections
const isNeonConnection = connectionString.includes('.neon.tech')

async function createPrismaClient(): Promise<PrismaClient> {
  if (isNeonConnection) {
    const { PrismaNeon } = await import('@prisma/adapter-neon')
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({ adapter })
  }
  // Local PostgreSQL - use pg adapter
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const expenseCategories = [
  {
    name: 'Rental Income',
    description: 'Booking revenue',
    scheduleELine: 'Line 3',
    isTaxDeductible: false,
  },
  {
    name: 'Advertising',
    description: 'Listing fees, photography, marketing',
    scheduleELine: 'Line 5',
  },
  { name: 'Auto & Travel', description: 'Mileage, trips to property', scheduleELine: 'Line 6' },
  {
    name: 'Cleaning & Maintenance',
    description: 'Cleaning service, minor repairs',
    scheduleELine: 'Line 7',
  },
  { name: 'Commissions', description: 'Platform fees (Airbnb, VRBO)', scheduleELine: 'Line 8' },
  { name: 'Insurance', description: 'Property, liability insurance', scheduleELine: 'Line 9' },
  {
    name: 'Legal & Professional',
    description: 'Accountant, attorney fees',
    scheduleELine: 'Line 10',
  },
  { name: 'Management Fees', description: 'Property manager fees', scheduleELine: 'Line 11' },
  { name: 'Mortgage Interest', description: 'Loan interest portion', scheduleELine: 'Line 12' },
  { name: 'Other Interest', description: 'Other loan interest', scheduleELine: 'Line 13' },
  { name: 'Repairs', description: 'Plumbing, HVAC, appliances', scheduleELine: 'Line 14' },
  { name: 'Supplies', description: 'Linens, toiletries, kitchen items', scheduleELine: 'Line 15' },
  { name: 'Property Taxes', description: 'Annual property taxes', scheduleELine: 'Line 16' },
  {
    name: 'Utilities',
    description: 'Electric, gas, water, internet, trash',
    scheduleELine: 'Line 17',
  },
  {
    name: 'Depreciation',
    description: 'Property depreciation',
    scheduleELine: 'Line 18',
    isTaxDeductible: true,
  },
  { name: 'HOA Fees', description: 'Homeowners association fees', scheduleELine: 'Line 19' },
  { name: 'Pest Control', description: 'Extermination services', scheduleELine: 'Line 19' },
  { name: 'Landscaping', description: 'Lawn care, snow removal', scheduleELine: 'Line 19' },
  {
    name: 'Licenses & Permits',
    description: 'Business license, STR permit',
    scheduleELine: 'Line 19',
  },
]

const notificationEvents: NotificationEvent[] = [
  'BOOKING_REQUEST',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'GUEST_CHECKIN_REMINDER',
  'GUEST_CHECKOUT_REMINDER',
  'MAINTENANCE_QUOTE_RECEIVED',
  'MAINTENANCE_COMPLETED',
  'NEW_MESSAGE',
]

const addons = [
  {
    name: 'Early Check-In',
    description: 'Check in as early as 1 PM (subject to availability)',
    price: 50.0,
  },
  {
    name: 'Late Checkout',
    description: 'Extend your checkout to 1 PM',
    price: 50.0,
  },
  {
    name: 'Pet Fee',
    description: 'Bring your furry friend (max 2 pets, dogs only)',
    price: 75.0,
  },
  {
    name: 'Hot Tub Heating',
    description: 'Have the hot tub heated and ready for your arrival',
    price: 35.0,
  },
  {
    name: 'Firewood Bundle',
    description: 'Bundle of seasoned firewood for the fireplace',
    price: 25.0,
  },
]

const main = async () => {
  const prisma = await createPrismaClient()

  try {
    console.log(`Seeding database (${isNeonConnection ? 'Neon' : 'local PostgreSQL'})...`)

    console.log('Seeding expense categories...')
    for (const [index, category] of expenseCategories.entries()) {
      await prisma.expenseCategory.upsert({
        where: { name: category.name },
        update: {},
        create: {
          ...category,
          isTaxDeductible: category.isTaxDeductible ?? true,
          sortOrder: index,
        },
      })
    }
    console.log(`Created ${expenseCategories.length} expense categories`)

    console.log('Creating default pricing config...')
    await prisma.pricingConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        baseNightlyRate: 150.0,
        weekendRate: 175.0,
        cleaningFee: 75.0,
        depositPercentage: 20,
        minNights: 2,
        maxNights: 14,
        maxGuests: 8,
      },
    })
    console.log('Created default pricing config')

    console.log('Seeding addons...')
    for (const [index, addon] of addons.entries()) {
      await prisma.addon.upsert({
        where: { name: addon.name },
        update: {},
        create: {
          ...addon,
          sortOrder: index,
        },
      })
    }
    console.log(`Created ${addons.length} addons`)

    console.log('Creating notification preferences...')
    for (const event of notificationEvents) {
      await prisma.notificationPreference.upsert({
        where: { event },
        update: {},
        create: {
          event,
          emailEnabled: true,
          smsEnabled: false,
        },
      })
    }
    console.log(`Created ${notificationEvents.length} notification preferences`)

    console.log('Seed completed successfully!')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e: unknown) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
