# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Short-term rental property management system (Big Bear cabin). Built with Next.js 16, TypeScript, Prisma/PostgreSQL, and deployed on Vercel. Uses Auth.js with Resend for passwordless email auth.

## Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # ESLint (strict TypeScript rules)
pnpm lint:fix               # Auto-fix lint issues
pnpm format                 # Format with Prettier
pnpm typecheck              # TypeScript check (noEmit)

# Testing
pnpm test                   # Vitest watch mode
pnpm test:run               # Single test run
pnpm test:run tests/unit/lib/calendar.test.ts  # Run specific test file
pnpm test:coverage          # Coverage report

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run migrations (dev)
pnpm db:seed                # Seed database
pnpm db:studio              # Open Prisma Studio
```

## Architecture

### Route Groups (App Router)

- `src/app/(public)/` - Guest-facing pages (booking flow, gallery, contact)
- `src/app/(auth)/` - Login/verify pages
- `src/app/owner/` - Owner dashboard (protected: OWNER role)
- `src/app/worker/` - Worker portal (protected: WORKER role)
- `src/app/api/` - API routes (cron jobs, webhooks, REST endpoints)

### Server Actions (`src/actions/`)

Primary data mutations. Each file corresponds to a domain: `bookings.ts`, `finance.ts`, `maintenance.ts`, `reports.ts`, `calendar.ts`, `notifications.ts`.

**Security**: Server Actions create public HTTP endpoints. Always:

1. Validate authorization first using guards from `src/lib/auth/guards.ts`
2. Validate all input with Zod schemas before processing
3. Never trust client data (searchParams, formData, headers)

### Auth & Authorization

- `src/lib/auth.ts` - NextAuth v5 config with Prisma adapter
- `src/proxy.ts` - Global route protection (Next.js 16 proxy pattern)
- `src/lib/auth/guards.ts` - Server-side role assertions (`assertOwner()`, `assertWorker()`, etc.) - use in server actions

### Key Libraries

- `src/lib/prisma.ts` - Prisma client singleton (uses global to prevent hot-reload duplicates)
- `src/lib/stripe.ts` - Stripe client
- `src/lib/env.ts` - Zod-validated environment variables (fails fast at startup)
- `src/lib/errors.ts` - Custom error classes (`AppError`, `NotFoundError`, `ValidationError`, etc.)
- `src/lib/notifications.ts` - Email (Resend) and SMS (Twilio) notifications
- `src/lib/rate-limit.ts` - Upstash Redis rate limiting

### User Roles (4 types)

`OWNER`, `GUEST`, `WORKER`, `ACCOUNTANT` - defined in Prisma schema, extended in `src/types/next-auth.d.ts`

## Modern Patterns

### Server Action Validation (Zod 4)

```typescript
'use server'
import { z } from 'zod'
import { assertOwner } from '@/lib/auth/guards'

const schema = z.object({
  email: z.email(),
  amount: z.coerce.number().positive(),
})

export async function createInvoice(formData: FormData) {
  await assertOwner() // Auth first

  const validated = schema.safeParse({
    email: formData.get('email'),
    amount: formData.get('amount'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }
  // Process validated.data
}
```

### React 19 Form Patterns

Use `useActionState` for form state with server actions:

```typescript
'use client'
import { useActionState } from 'react'
import { createUser } from '@/actions/users'

const [state, formAction, pending] = useActionState(createUser, initialState)
// state contains returned errors/data, pending for loading states
```

Use `useOptimistic` for instant UI feedback:

```typescript
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [
  ...state,
  newItem,
])
```

### Data Transfer Objects (DTOs)

When returning data to clients, filter sensitive fields:

```typescript
// Don't return entire user objects with passwords/tokens
return { id: user.id, name: user.name, email: user.email }
```

## Testing

Tests in `tests/` directory:

- `tests/unit/` - Unit tests for lib functions and actions
- `tests/data-paths/` - Integration-style tests for workflows
- `tests/patterns/` - Database pattern tests (state machines, cascades)
- `tests/__mocks__/` - Vitest mocks for Prisma, auth, external services

Prisma is mocked via `vitest-mock-extended`. Import from `tests/__mocks__/prisma.ts`:

```typescript
import { prismaMock } from 'tests/__mocks__/prisma'
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
```

## TypeScript Configuration

Strict mode with additional checks:

- `noUncheckedIndexedAccess` - array/object access returns `T | undefined`
- `noImplicitReturns` - all code paths must return
- `noFallthroughCasesInSwitch` - switch cases must break or return

## Avoiding Linter Errors

This project uses `strictTypeChecked` + `stylisticTypeChecked` from typescript-eslint. Common pitfalls:

### Floating Promises (`no-floating-promises`)

```typescript
// BAD: Promise not handled
saveData()

// GOOD: Await it
await saveData()

// GOOD: Explicitly ignore with void
void saveData()

// GOOD: Handle with .catch()
saveData().catch(console.error)
```

### Async Event Handlers (`no-misused-promises`)

```typescript
// BAD: async function as onClick
<button onClick={async () => await save()}>

// GOOD: Wrap in non-async handler
<button onClick={() => { void save() }}>

// GOOD: Or handle promise explicitly
<button onClick={() => { save().catch(console.error) }}>
```

### Template Literals (`restrict-template-expressions`)

```typescript
// BAD: Objects/arrays in template
const msg = `User: ${user}` // [object Object]

// GOOD: Only strings/numbers (numbers allowed in this project)
const msg = `User: ${user.name}`
const price = `$${amount}` // numbers OK
```

### Type Imports (`consistent-type-imports`)

```typescript
// BAD
import { User } from '@prisma/client'

// GOOD: Use 'import type' for type-only imports
import type { User } from '@prisma/client'

// GOOD: Inline type imports when mixing
import { prisma, type User } from '@/lib/prisma'
```

### Non-Null Assertions (`no-non-null-assertion`)

```typescript
// BAD
const name = user!.name

// GOOD: Proper null check
if (!user) throw new Error('User not found')
const name = user.name

// GOOD: Optional chaining with fallback
const name = user?.name ?? 'Unknown'
```

### Array/Object Access (`noUncheckedIndexedAccess`)

```typescript
// items[0] returns T | undefined due to tsconfig
const first = items[0]
if (!first) return // Must check before use

// Or use .at() with check
const last = items.at(-1)
if (last) {
  /* use last */
}
```

### Switch Exhaustiveness (`switch-exhaustiveness-check`)

```typescript
// Must handle all enum values
function getLabel(status: BookingStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'CONFIRMED':
      return 'Confirmed'
    case 'CANCELLED':
      return 'Cancelled'
    case 'COMPLETED':
      return 'Completed'
    case 'NO_SHOW':
      return 'No Show'
    // No default - compiler ensures all cases covered
  }
}
```

### Unused Variables

```typescript
// Prefix with underscore to mark intentionally unused
const [_first, second] = tuple
catch (_error) { /* error intentionally ignored */ }
function handler(_req: Request) { /* req not needed */ }
```

## Path Alias

`@/*` maps to `src/*` (configured in tsconfig.json and vitest.config.ts)

## Plan Mode Workflow Rules

When in **Plan Mode** (or when asked to create a plan), you MUST follow this protocol:

1. **Research First**: Before writing the plan file, use the `ref_search_documentation` or `ref_read_url` tools to verify any libraries, APIs, or versions involved in the task.
2. **No Assumptions**: Do not assume API signatures or library methods. Use the Ref tool to find the official documentation.
3. **Minmize the Clutter**: Only use the Ref tool to obtain the **MINIMUM** but still comprehensive info to complete the task.
