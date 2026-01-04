# Phase 7: Maintenance Portal - Implementation Plan

## Overview
Build the maintenance worker portal and owner management page including job posting, quote submission, scheduling, and work completion with proof uploads.

## Implementation Order (26 files total)

### Step 1: Schema Updates
**File:** `prisma/schema.prisma`

1. **Update JobStatus enum** (line ~263):
   - Add: `ASSIGNED`, `SCHEDULED`, `PAID`
   - Final: OPEN, QUOTED, ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, APPROVED, PAID, CANCELLED

2. **Update MaintenanceJob model** (line ~279):
   - Add: `assignedWorkerId String?`, `scheduledDate DateTime?`, `scheduledTime String?`, `completedAt DateTime?`
   - Add relation: `assignedWorker WorkerProfile? @relation(fields: [assignedWorkerId], references: [id])`

3. **Update WorkCompletion model** (line ~312):
   - Add: `unexpectedIssues String?`, `finalAmount Decimal? @db.Decimal(10, 2)`, `isPaid Boolean @default(false)`, `paidAt DateTime?`

4. **Update WorkerProfile model** (line ~77):
   - Add: `trustworthiness Int?`, `notes String?`
   - Add inverse relation: `assignedJobs MaintenanceJob[]`

---

### Step 2: Auth Guards
**File:** `src/lib/auth/guards.ts`

Add after existing guards:
```typescript
export const assertWorker = async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'WORKER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertOwnerOrWorker = async () => {
  const session = await auth()
  if (!session?.user || !['OWNER', 'WORKER'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  return session
}
```

---

### Step 3: Server Actions
**New File:** `src/actions/maintenance.ts`

**Worker Actions:**
- `getAvailableJobs()` - Fetch OPEN jobs
- `getAssignedJobs()` - Fetch worker's assigned jobs
- `getWorkerQuotes()` - Fetch worker's submitted quotes
- `submitQuote(data)` - Submit quote for job
- `bookTimeslot(data)` - Book time slot for assigned job
- `submitWorkCompletion(data)` - Submit work with photos

**Owner Actions:**
- `createMaintenanceJob(data)` - Create new job
- `getMaintenanceJobs(filters?)` - Fetch all jobs with relations
- `acceptQuote(quoteId)` - Accept quote, assign worker
- `approveWorkCompletion(completionId)` - Approve completed work
- `markWorkerPaid(completionId)` - Mark as paid
- `getWorkers()` - Get all worker profiles
- `updateWorkerProfile(workerId, data)` - Update trustworthiness/notes
- `inviteWorker(data)` - Create user + profile

---

### Step 4: Upload API
**New File:** `src/app/api/upload/maintenance/route.ts`

Photo upload endpoint for maintenance (pattern from `src/app/api/upload/receipts/route.ts`):
- Allow OWNER and WORKER roles
- Accept image/jpeg, image/png, image/webp

---

### Step 5: Worker Layout & Navigation
**New Files:**
- `src/app/worker/layout.tsx` - Auth guard for WORKER role
- `src/components/worker/WorkerNav.tsx` - Worker sidebar navigation

Nav items: Jobs, My Quotes, Schedule

---

### Step 6: Worker Components
**New Directory:** `src/components/worker/`

| Component | Purpose |
|-----------|---------|
| `JobCard.tsx` | Display job with priority badge and actions |
| `QuoteForm.tsx` | Form to submit quote |
| `TimeslotPicker.tsx` | Calendar-based slot picker |
| `CompletionForm.tsx` | Work completion form with details |
| `ProofPhotoUploader.tsx` | Photo upload (pattern from ReceiptUploader) |
| `JobList.tsx` | List of JobCards with empty state |

---

### Step 7: Worker Pages
**New Files:**
- `src/app/worker/jobs/page.tsx` - Available + Assigned jobs
- `src/app/worker/quotes/page.tsx` - Submitted quotes with status
- `src/app/worker/schedule/page.tsx` - Calendar view + booking
- `src/app/worker/complete/[jobId]/page.tsx` - Completion form

---

### Step 8: Owner Maintenance Components
**New Directory:** `src/components/maintenance/`

| Component | Purpose |
|-----------|---------|
| `JobForm.tsx` | Create new maintenance job |
| `JobList.tsx` | Table of all jobs with filters |
| `QuoteReview.tsx` | Review/accept quotes panel |
| `CompletionReview.tsx` | Review/approve work panel |
| `WorkerList.tsx` | Worker management table |
| `InviteWorkerForm.tsx` | Worker invitation form |

---

### Step 9: Owner Maintenance Page
**New File:** `src/app/owner/maintenance/page.tsx`

Tabbed interface:
- **Jobs Tab:** JobList + JobForm
- **Workers Tab:** WorkerList + InviteWorkerForm

---

### Step 10: OwnerNav Update
**File:** `src/components/owner/OwnerNav.tsx`

Add maintenance item to navItems (after Calendar, before Finance):
```typescript
{ href: '/owner/maintenance', label: 'Maintenance', icon: /* wrench */ }
```

---

### Step 11: Unit Tests
**New File:** `tests/unit/actions/maintenance.test.ts`

Test coverage for:
- Authorization (WORKER-only, OWNER-only actions)
- submitQuote workflow
- acceptQuote state transitions
- approveWorkCompletion + markWorkerPaid
- inviteWorker creation

Pattern from `tests/unit/actions/finance.test.ts`

---

### Step 12: Serena Memory
**New Memory:** `maintenance_portal_patterns`

Document:
- Worker auth guard usage
- WorkerProfile lookup pattern
- Job status flow
- Photo upload endpoint

---

## File Summary

### New Files (23)
```
src/actions/maintenance.ts
src/app/api/upload/maintenance/route.ts
src/app/worker/layout.tsx
src/app/worker/jobs/page.tsx
src/app/worker/quotes/page.tsx
src/app/worker/schedule/page.tsx
src/app/worker/complete/[jobId]/page.tsx
src/components/worker/WorkerNav.tsx
src/components/worker/JobCard.tsx
src/components/worker/QuoteForm.tsx
src/components/worker/TimeslotPicker.tsx
src/components/worker/CompletionForm.tsx
src/components/worker/ProofPhotoUploader.tsx
src/components/worker/JobList.tsx
src/components/maintenance/JobForm.tsx
src/components/maintenance/JobList.tsx
src/components/maintenance/QuoteReview.tsx
src/components/maintenance/CompletionReview.tsx
src/components/maintenance/WorkerList.tsx
src/components/maintenance/InviteWorkerForm.tsx
src/app/owner/maintenance/page.tsx
tests/unit/actions/maintenance.test.ts
.serena/memories/maintenance_portal_patterns.md
```

### Modified Files (3)
```
prisma/schema.prisma
src/lib/auth/guards.ts
src/components/owner/OwnerNav.tsx
```

---

## Critical Reference Files
- `src/app/owner/layout.tsx` - Layout pattern
- `src/components/owner/OwnerNav.tsx` - Nav pattern
- `src/actions/finance.ts` - Server action patterns
- `src/lib/auth/guards.ts` - Auth guard patterns
- `src/components/finance/ReceiptUploader.tsx` - Upload pattern
- `tests/unit/actions/finance.test.ts` - Test patterns

---

## Job Status Flow
```
OPEN → QUOTED → ASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED → APPROVED → PAID
  ↓                                                                            ↓
CANCELLED ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

## Deliverables Checklist
- [ ] Worker layout and navigation
- [ ] Job listing for workers
- [ ] Quote submission system
- [ ] Timeslot booking
- [ ] Work completion with proof photos
- [ ] Owner job creation
- [ ] Quote review and acceptance
- [ ] Work approval workflow
- [ ] Worker payment tracking
- [ ] Worker invitation system
- [ ] Worker trustworthiness rating
- [ ] Unit tests for all actions
