<!-- Generated: 2026-03-28 | Files scanned: 1 | Token estimate: ~1200 -->

# Data Codemap — Database Schema

**Location**: `prisma/schema.prisma`
**Database**: PostgreSQL (Neon serverless)
**ORM**: Prisma v7.6.0
**Adapter**: Neon serverless adapter for edge compatibility

## Core Models & Relations

### Auth.js Models

```
Account    ←→ User (1:many)   [OAuth provider info]
Session    ←→ User (1:many)   [Session tokens]
VerificationToken (for password resets, etc.)
```

### User Models

```
User (root model)
├── id, email, name, phone, image, role
├── isFamilyMember: boolean
├── createdAt, updatedAt
├── Relations:
    ├── accounts: Account[]
    ├── sessions: Session[]
    ├── bookings: Booking[]      [As guest]
    ├── workerProfile?: WorkerProfile?
    └── sentMessages: Message[]

WorkerProfile (extends User for maintenance workers)
├── id, userId
├── businessName, services[], phoneNumber, address, taxId
├── isActive, trustworthiness, notes
├── Relations:
    ├── user: User
    ├── quotes: Quote[]
    ├── workCompletions: WorkCompletion[]
    └── assignedJobs: MaintenanceJob[]
```

### Booking Models

```
Booking
├── id, guestId, checkIn, checkOut
├── guestName, guestEmail, guestPhone, numberOfGuests
├── basePrice, addonsTotal, depositAmount, totalAmount
├── paymentIntentId (Stripe), status
├── specialRequests, notes
├── createdAt, updatedAt
├── Indexes: [checkIn, checkOut], [status], [guestId]
├── Relations:
    ├── guest: User
    ├── addons: BookingAddon[]
    ├── transactions: Transaction[]
    ├── messages: Message[]
    ├── galleryImages: GalleryImage[]
    └── review: Review?

BookingStatus enum: PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW

Addon
├── id, name, description, price, isActive, sortOrder
├── Relations: bookingAddons: BookingAddon[]

BookingAddon (junction)
├── id, bookingId, addonId, quantity, price
├── Unique: [bookingId, addonId]
├── Relations: booking, addon

StripeEvent (webhook tracking)
├── id (Stripe evt_xxx), type, status, createdAt, processedAt

BlockedDate
├── id, startDate, endDate, reason, notes, source
├── externalId (for iCal sync)
├── Indexes: [startDate, endDate]

CalendarSync
├── id, name, icalUrl, isActive
├── lastSynced, lastError, syncCount
```

### Pricing & Configuration

```
PricingConfig (singleton, id="default")
├── baseNightlyRate, weekendRate, weekendDays[]
├── cleaningFee, depositPercentage
├── minNights, maxNights, maxGuests
├── petFee?, extraGuestFee?, extraGuestThreshold?
├── createdAt, updatedAt
```

### Finance Models

```
ExpenseCategory
├── id, name, description
├── scheduleELine (tax form reference)
├── isTaxDeductible, sortOrder
├── Relations: transactions: Transaction[]

Transaction
├── id, type, categoryId, amount, date, description
├── vendor, bookingId?, notes
├── createdAt, updatedAt
├── Indexes: [date], [type], [bookingId], [categoryId]
├── Relations:
    ├── category: ExpenseCategory
    ├── booking?: Booking?
    └── receipts: Receipt[]

TransactionType enum: INCOME | EXPENSE

Receipt (receipt images for transactions)
├── id, transactionId, fileName, fileUrl, fileSize, mimeType
├── createdAt
├── Relations: transaction: Transaction
```

### Maintenance Models

```
MaintenanceJob
├── id, title, description
├── priority (LOW|MEDIUM|HIGH|URGENT), status
├── dueDate, images[], notes
├── assignedWorkerId?, scheduledDate?, scheduledTime?
├── completedAt
├── Indexes: [status], [assignedWorkerId]
├── Relations:
    ├── assignedWorker?: WorkerProfile?
    ├── quotes: Quote[]
    └── workCompletions: WorkCompletion[]

JobStatus enum: OPEN | QUOTED | ASSIGNED | SCHEDULED | IN_PROGRESS | COMPLETED | APPROVED | PAID | CANCELLED
JobPriority enum: LOW | MEDIUM | HIGH | URGENT

Quote
├── id, jobId, workerId, amount, description
├── estimatedDays?, isApproved
├── submittedAt, expiresAt?
├── Indexes: [jobId]
├── Relations: job, worker

WorkCompletion
├── id, jobId, workerId
├── description, images[], hoursWorked?, materialsUsed?
├── unexpectedIssues?, finalAmount?
├── isApproved, isPaid
├── submittedAt, approvedAt?, paidAt?
├── Indexes: [jobId]
├── Relations: job, worker
```

### Messaging Models

```
Message
├── id, senderId, bookingId?, content
├── isRead, createdAt
├── Indexes: [bookingId], [createdAt]
├── Relations:
    ├── sender: User
    └── booking?: Booking?
```

### Notification Models

```
NotificationEvent enum
├── BOOKING_REQUEST | BOOKING_CONFIRMED | BOOKING_CANCELLED
├── PAYMENT_RECEIVED | PAYMENT_FAILED
├── GUEST_CHECKIN_REMINDER | GUEST_CHECKOUT_REMINDER
├── MAINTENANCE_QUOTE_RECEIVED | MAINTENANCE_COMPLETED
├── NEW_MESSAGE | GALLERY_INVITE | FAMILY_INVITE | REVIEW_INVITE

NotificationPreference
├── id, event (unique), emailEnabled, smsEnabled
├── createdAt, updatedAt

NotificationLog (audit trail)
├── id, event, recipient, channel, subject, body
├── status, error?, metadata?, createdAt
├── Indexes: [event], [createdAt]
```

### Review Models

```
Review
├── id, bookingId (unique), guestName
├── rating (1-5), body, photoUrls[]
├── isPublished, createdAt, updatedAt
├── Relations: booking: Booking
```

### Gallery Models

```
GalleryImage
├── id, url, alt?, caption?, category?
├── sortOrder, isFeatured, isPublished
├── uploadedBy (OWNER|GUEST), bookingId?
├── createdAt, updatedAt
├── Indexes: [category], [sortOrder], [bookingId]
├── Relations: booking?: Booking?

ImageUploader enum: OWNER | GUEST
```

## Key Relationships

| Relationship                    | Type   | Purpose                         |
| ------------------------------- | ------ | ------------------------------- |
| User → Booking                  | 1:many | Guests book stays               |
| Booking → Transaction           | 1:many | Income for each booking         |
| Booking → Review                | 1:1    | Guest submits post-stay review  |
| Booking → GalleryImage          | 1:many | Guests upload photos            |
| Transaction → Receipt           | 1:many | Receipts for expenses           |
| MaintenanceJob → Quote          | 1:many | Workers bid on jobs             |
| MaintenanceJob → WorkCompletion | 1:many | Worker submits completion proof |
| WorkerProfile → MaintenanceJob  | 1:many | Worker assigned to jobs         |

## Enum Summary

| Enum              | Values                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| UserRole          | OWNER, GUEST, WORKER, ACCOUNTANT                                                     |
| BookingStatus     | PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW                                    |
| JobStatus         | OPEN, QUOTED, ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, APPROVED, PAID, CANCELLED |
| JobPriority       | LOW, MEDIUM, HIGH, URGENT                                                            |
| TransactionType   | INCOME, EXPENSE                                                                      |
| NotificationEvent | 13 event types (see above)                                                           |
| ImageUploader     | OWNER, GUEST                                                                         |

## Indexes

Optimized for common queries:

```
Booking: (checkIn, checkOut), status, guestId
BlockedDate: (startDate, endDate)
Transaction: date, type, bookingId, categoryId
MaintenanceJob: status, assignedWorkerId
Quote: jobId
WorkCompletion: jobId
GalleryImage: category, sortOrder, bookingId
Message: bookingId, createdAt
NotificationLog: event, createdAt
```

---

**Last Updated**: 2026-03-28
