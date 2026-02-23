# SERVER ACTIONS

Domain-driven server actions. Each file = one business domain. All use `'use server'` directive.

## STRUCTURE

| File               | Domain            | Auth Guard                | Actions                                  | Key Models                            |
| ------------------ | ----------------- | ------------------------- | ---------------------------------------- | ------------------------------------- |
| `bookings.ts`      | Booking lifecycle | `assertOwner`             | approve, reject, cancel                  | Booking, Stripe                       |
| `calendar.ts`      | Availability      | `assertOwner`             | block/unblock dates, sync management     | BlockedDate, CalendarSync             |
| `finance.ts`       | Accounting        | `assertOwnerOrAccountant` | CRUD expenses/receipts, summaries        | Transaction, Receipt, ExpenseCategory |
| `gallery.ts`       | Gallery           | `assertOwner`             | create, update, delete, reorder, uploads | GalleryImage                          |
| `maintenance.ts`   | Job management    | Mixed (owner+worker)      | 15 actions for full job lifecycle        | MaintenanceJob, Quote, WorkCompletion |
| `notifications.ts` | Preferences       | `assertOwner`             | update/get notification prefs            | NotificationPreference                |
| `reports.ts`       | Financial reports | `assertOwnerOrAccountant` | monthly, annual, Schedule E, CSV export  | Transaction, ExpenseCategory          |

## WHERE TO LOOK

| Task                  | File             | Notes                                                  |
| --------------------- | ---------------- | ------------------------------------------------------ |
| Add booking mutation  | `bookings.ts`    | Only OWNER can approve/reject/cancel                   |
| Add financial feature | `finance.ts`     | OWNER or ACCOUNTANT; validate with Zod                 |
| Add worker action     | `maintenance.ts` | Use `assertWorker()`; fetch WorkerProfile from session |
| Add gallery action    | `gallery.ts`     | Token-gated guest uploads; owner CRUD via assertOwner  |
| Add owner-only action | Any              | Start with `await assertOwner()`                       |
| Add report type       | `reports.ts`     | Return typed interface, no revalidate needed           |

## CONVENTIONS

- **Guard order**: Auth guard → Zod validate → Prisma query → revalidatePath
- **Return shape**: `{ success: true, data? }` for mutations; typed interfaces for reads
- **Notifications**: Fire after mutations with `.catch(() => {})` — never block on send
- **Pagination**: `finance.ts` and `maintenance.ts` use `{ data, total, page, pageSize, totalPages }`
- **State machine** (maintenance): OPEN → QUOTED → ASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED → APPROVED → PAID
- **Zod errors**: Use `z.treeifyError(error).properties` (NOT `error.flatten()`)

## ANTI-PATTERNS

- **NEVER** skip auth guard — server actions create public HTTP endpoints
- **NEVER** return raw Prisma Decimal — convert with `Number()`
- **NEVER** block on notification sends — always `.catch(() => {})`
- **NEVER** use `error.flatten()` — use `z.treeifyError(error).properties` (Zod 4)

## NOTES

- `maintenance.ts` is largest (633 lines, 15 actions) — worker + owner actions in one file
- `errors.ts` custom classes exist but actions throw generic `Error('message')` instead
- Guards return session object — use it for user context (e.g., `session.user.id`)
- `getWorkerProfile()` in maintenance.ts uses `auth()` directly (inconsistent with other guards)
- **Zod v4 API**: `z.treeifyError()` is the correct Zod v4 API for error handling (replaces deprecated `error.flatten()`)
- `reports.ts` returns typed interfaces (not mutations) — no `revalidatePath` needed
