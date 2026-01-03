import { PrismaClient, type NotificationEvent } from '@prisma/client'

const prisma = new PrismaClient()

const expenseCategories = [
  { name: 'Rental Income', description: 'Booking revenue', scheduleELine: 'Line 3', isTaxDeductible: false },
  { name: 'Advertising', description: 'Listing fees, photography, marketing', scheduleELine: 'Line 5' },
  { name: 'Auto & Travel', description: 'Mileage, trips to property', scheduleELine: 'Line 6' },
  { name: 'Cleaning & Maintenance', description: 'Cleaning service, minor repairs', scheduleELine: 'Line 7' },
  { name: 'Commissions', description: 'Platform fees (Airbnb, VRBO)', scheduleELine: 'Line 8' },
  { name: 'Insurance', description: 'Property, liability insurance', scheduleELine: 'Line 9' },
  { name: 'Legal & Professional', description: 'Accountant, attorney fees', scheduleELine: 'Line 10' },
  { name: 'Management Fees', description: 'Property manager fees', scheduleELine: 'Line 11' },
  { name: 'Mortgage Interest', description: 'Loan interest portion', scheduleELine: 'Line 12' },
  { name: 'Other Interest', description: 'Other loan interest', scheduleELine: 'Line 13' },
  { name: 'Repairs', description: 'Plumbing, HVAC, appliances', scheduleELine: 'Line 14' },
  { name: 'Supplies', description: 'Linens, toiletries, kitchen items', scheduleELine: 'Line 15' },
  { name: 'Property Taxes', description: 'Annual property taxes', scheduleELine: 'Line 16' },
  { name: 'Utilities', description: 'Electric, gas, water, internet, trash', scheduleELine: 'Line 17' },
  { name: 'Depreciation', description: 'Property depreciation', scheduleELine: 'Line 18', isTaxDeductible: true },
  { name: 'HOA Fees', description: 'Homeowners association fees', scheduleELine: 'Line 19' },
  { name: 'Pest Control', description: 'Extermination services', scheduleELine: 'Line 19' },
  { name: 'Landscaping', description: 'Lawn care, snow removal', scheduleELine: 'Line 19' },
  { name: 'Licenses & Permits', description: 'Business license, STR permit', scheduleELine: 'Line 19' },
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

const main = async () => {
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
}

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
