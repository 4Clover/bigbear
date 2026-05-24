<!-- Generated: 2026-03-28 | Files scanned: 8 | Token estimate: ~1000 -->

# Frontend Codemap — Pages & Components

## Page Tree

```
src/app/
├── (public)/                 # Guest-facing pages
│   ├── page.tsx             # Home page
│   ├── book/                # Booking flow
│   │   ├── page.tsx         # Booking form
│   │   └── BookingContent.tsx
│   ├── booking/success      # Confirmation page (post-payment)
│   ├── gallery/             # Photo gallery (public)
│   ├── gallery/upload       # Guest photo upload (token-gated)
│   ├── review/              # Review form (token-gated)
│   ├── contact/             # Contact form
│   ├── terms/               # Legal pages
│   ├── privacy/
│   └── cancellation-policy/
│
├── (auth)/                   # Authentication pages
│   ├── login/               # Email + Google login
│   ├── verify/              # Email verification prompt
│   └── layout.tsx           # Auth layout
│
├── owner/                    # Owner dashboard (OWNER role required)
│   ├── layout.tsx           # Sidebar nav + guards
│   ├── dashboard/           # Overview cards, recent bookings
│   ├── bookings/            # List, approve, cancel, refund
│   ├── calendar/            # Big Calendar + block dates
│   ├── gallery/             # Upload, reorder, delete images
│   ├── finance/             # Transactions, categories, reports, charts
│   ├── maintenance/         # Jobs, quotes, worker assignments
│   ├── reviews/             # Published reviews, moderation
│   └── settings/            # User profile, family invites, notifications
│
├── worker/                   # Worker portal (WORKER role required)
│   ├── layout.tsx           # Navigation + guards
│   ├── dashboard/           # Overview cards, assigned jobs
│   ├── jobs/                # Assigned + available jobs
│   ├── schedule/            # Work schedule calendar
│   ├── quotes/              # Submitted quotes, status
│   └── profile/             # Business info, services, ratings
│
└── api/                      # API routes
    ├── auth/[...nextauth]   # NextAuth handlers
    ├── booking/             # Create booking
    ├── availability/        # Check availability
    ├── pricing/             # Get pricing config
    ├── addons/              # Get add-ons list
    ├── contact/             # Contact form submission
    ├── gallery/upload       # Token-gated image upload
    ├── reviews/             # Token-gated review submit
    ├── family/accept        # Token-gated family invite
    ├── stripe/webhook       # Stripe event handler
    ├── calendar/sync        # iCal sync
    ├── cron/reminders       # Send reminders
    └── cron/calendar-sync   # Sync calendars
```

## Component Hierarchy

```
src/components/
├── layout/                  # Shared layouts
│   ├── Header.tsx          # Navigation bar
│   ├── Footer.tsx
│   ├── OwnerSidebar.tsx    # Owner nav sidebar
│   └── WorkerSidebar.tsx   # Worker nav sidebar
│
├── booking/                # Booking flow
│   ├── BookingForm.tsx     # Multi-step form
│   ├── AddonSelector.tsx   # Add-ons (pets, parking, etc.)
│   ├── DatePicker.tsx      # Check-in/out selection
│   └── GuestInfo.tsx       # Name, email, phone, guests
│
├── gallery/                # Image gallery
│   ├── GalleryGrid.tsx     # Photo display
│   ├── ImageUpload.tsx     # Drag-drop uploader
│   └── GalleryModal.tsx    # Lightbox
│
├── finance/                # Financial dashboards
│   ├── TransactionList.tsx # Ledger view
│   ├── Charts/             # Monthly revenue, expense charts
│   │   ├── RevenueChart.tsx
│   │   ├── ExpenseChart.tsx
│   │   └── NetIncomeChart.tsx
│   ├── CategoryForm.tsx    # Add/edit expense categories
│   ├── ReceiptUpload.tsx   # Attach receipts to transactions
│   └── TaxReportDialog.tsx # Tax summary export
│
├── maintenance/            # Maintenance management
│   ├── JobForm.tsx         # Create/edit job
│   ├── JobCard.tsx         # Job preview
│   ├── QuoteCard.tsx       # Worker quotes
│   ├── WorkCompletionForm.tsx # Submit completion
│   └── AssignWorkerDialog.tsx
│
├── reports/                # Reports & exports
│   ├── BookingReport.tsx   # Occupancy, rates
│   ├── TaxReport.tsx       # Income, deductions
│   └── CustomReportBuilder.tsx
│
├── pdf/                    # PDF generation
│   ├── InvoicePDF.tsx      # Booking invoice
│   ├── TaxReportPDF.tsx    # Tax summary
│   └── MaintenanceQuotePDF.tsx
│
├── charts/                 # Recharts visualizations
│   ├── BarChart.tsx
│   ├── LineChart.tsx
│   ├── PieChart.tsx
│   └── AreaChart.tsx
│
├── ui/                     # Base UI components (Radix + Tailwind)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Dialog.tsx
│   ├── Card.tsx
│   ├── Sidebar.tsx
│   ├── Table.tsx
│   ├── Tabs.tsx
│   ├── AlertDialog.tsx
│   └── ... (20+ more Radix + custom components)
│
├── owner/                  # Owner-specific components
│   ├── DashboardCards.tsx  # KPI cards (revenue, bookings, etc.)
│   └── RecentBookingsTable.tsx
│
└── worker/                 # Worker-specific components
    ├── AssignedJobsList.tsx
    ├── JobDetailCard.tsx
    └── QuoteSubmitForm.tsx
```

## React 19 Patterns Used

**useActionState** (form mutations):

```typescript
const [state, formAction, pending] = useActionState(updateProfile, initialState)
// formAction → server action, state contains errors/success, pending indicates loading
```

**useOptimistic** (instant UI feedback):

```typescript
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [
  ...state,
  newItem,
])
// Immediately show new item while server processes
```

**Client vs Server Components**:

- Page components (RSC) — fetch data, authorize, render content
- Interactive sections — 'use client' for forms, dialogs, modals
- Client boundaries at low leaf components — avoid excessive client JavaScript

## Key Component Patterns

**Protected Page Wrapper**:

```typescript
// src/app/owner/layout.tsx
import { auth } from '@/lib/auth'
export default async function OwnerLayout() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'OWNER') {
    redirect('/login')
  }
  // ... render layout
}
```

**Server Action Form**:

```typescript
// Form with useActionState
'use client'
const [state, formAction, pending] = useActionState(updateProfile, { success: true })
return <form action={formAction}> ... </form>
```

**Token-Gated Page**:

```typescript
// src/app/(public)/review/page.tsx
const token = searchParams.token
if (!verifyReviewToken(token)) {
  return <Unauthorized />
}
// Show review form
```

---

**Last Updated**: 2026-03-28
