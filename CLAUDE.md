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

- `src/lib/prisma.ts` - Prisma client singleton (Neon serverless adapter, uses global to prevent hot-reload duplicates)
- `src/lib/stripe.ts` - Stripe client
- `src/lib/env.ts` - Zod-validated environment variables (fails fast at startup)
- `src/lib/errors.ts` - Custom error classes (`AppError`, `NotFoundError`, `ValidationError`, etc.)
- `src/lib/notifications.ts` - Email (Resend) and SMS (Twilio) notifications; Twilio client is lazy-loaded
- `src/lib/rate-limit.ts` - Upstash Redis rate limiting
- `src/lib/auth/secure-action.ts` - `secureAction()` and `secureFormAction()` wrappers (auth + validation in one)

### Cache Invalidation (`src/lib/cache/invalidation.ts`)

Centralized `CacheTags` object defines tag names per domain. Domain invalidation helpers combine `revalidateTag()` + `revalidatePath()`:

- `invalidateGallery()`, `invalidateBookings()`, `invalidateMaintenance()`, `invalidateFinance()`, `invalidateCalendar()`, `invalidateNotifications()`

Always use these helpers in server actions instead of manual `revalidatePath()` calls — they ensure all related paths and tags are invalidated together.

### User Roles (4 types)

`OWNER`, `GUEST`, `WORKER`, `ACCOUNTANT` - defined in Prisma schema, extended in `src/types/next-auth.d.ts`

## Modern Patterns

### Server Action Validation (Zod 4)

Two approaches — use `secureAction` wrapper for new actions (preferred), or manual guards for complex cases:

```typescript
// PREFERRED: secureAction wrapper (auth + validation combined)
'use server'
import { secureAction } from '@/lib/auth/secure-action'

const schema = z.object({ id: z.string() })

export const deleteImage = secureAction({ roles: 'OWNER', schema }, async ({ session, data }) => {
  await prisma.galleryImage.delete({ where: { id: data.id } })
  return { success: true }
})
```

```typescript
// For useActionState forms: secureFormAction wrapper
import { secureFormAction } from '@/lib/auth/secure-action'

export const updateProfile = secureFormAction(
  { roles: 'OWNER', schema: profileSchema },
  async ({ session, data }) => {
    await prisma.user.update({ where: { id: session.user.id }, data })
    return { success: true }
  }
)
// Client: const [state, formAction, pending] = useActionState(updateProfile, { success: true })
```

```typescript
// MANUAL: For complex multi-step actions with custom error handling
'use server'
import { z } from 'zod'
import { assertOwner } from '@/lib/auth/guards'

export async function createInvoice(formData: FormData) {
  await assertOwner() // Auth first
  const validated = schema.safeParse(Object.fromEntries(formData.entries()))
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

Planned or in-limbo feature or function?

```typescript
// Prefix with underscore to mark intentionally unused
const [_first, second] = tuple
catch (_error) { /* error intentionally ignored */ }
function handler(_req: Request) { /* req not needed */ }
```

Include a comment block at its beginning:

"#|--------------------------------|"
"#| %%% XYZ SCAFFOLDING %%%%%%%%%%%|"
"#| TODO: Implement when relevant. |"
"#|--------------------------------|"

## Path Alias

`@/*` maps to `src/*` (configured in tsconfig.json and vitest.config.ts)

## Documentation Lookup

When working with libraries (Prisma, Stripe, Resend, Auth.js, Zod, date-fns, etc.), check the docs with Ref. Use `ref_search_documentation` to find relevant docs and `ref_read_url` to read full content from results. Include library/framework names in queries for best results.

When encountering lint errors or API mismatches from libraries, search Ref to verify correct patterns before guessing.

Context7 MCP (`resolve-library-id` then `query-docs`) is also available for retrieving up-to-date library docs and code examples.

Fetch only the minimum info needed — do not over-search on every prompt.

## Serena (Symbolic Code Tools)

Serena provides semantic code navigation and editing via MCP. Key tools:

- **`get_symbols_overview`** - Get all symbols in a file without reading bodies
- **`find_symbol`** - Search by name path pattern (e.g. `Foo/bar`), with optional `include_body=True` and `depth` control
- **`find_referencing_symbols`** - Find all references to a symbol (with code snippets)
- **`replace_symbol_body`** / **`insert_after_symbol`** / **`insert_before_symbol`** - Symbolic editing
- **`replace_content`** - Regex-based file editing for targeted line changes
- **`search_for_pattern`** - Fast regex search across the codebase

**Usage strategy**: Prefer symbolic tools over reading entire files. Get an overview first (`get_symbols_overview`), then read only the symbol bodies you need (`find_symbol` with `include_body=True`). Use `find_referencing_symbols` before editing to ensure changes are backward-compatible or all references are updated.

**Project must be activated first**: Call `activate_project` with `/home/clovr/projects/grizzly` before using Serena tools.

### Serena Memories (`.serena/memories/`)

Project-specific patterns (read on-demand when relevant to the task):

- `zod-validation-patterns` - Zod 4 syntax, lenient ID validation
- `react-ref-forwarding` - forwardRef for form components
- `prisma-enum-type-safety` - Prisma enums in Record types
- `test-mock-update-patterns` - Updating test mocks after changes
- `coding-patterns-guide` - Conditional logic, unused params, dynamic imports

## Plan Mode Workflow Rules

When in **Plan Mode** (or when asked to create a plan), follow this protocol:

1. **Research First**: Use Ref tools (see MCP Servers section) to verify libraries/APIs before writing the plan
2. **No Assumptions**: Validate API signatures with documentation, not guesses
3. **Minimize Output**: Plans should be concise and actionable

## External Review Tool Suggestions (CodeRabbit, etc.)

When fixing issues reported by external code review tools (CodeRabbit, etc.), **verify suggestions via Ref before applying**. These tools may use outdated API information.

**Workflow:**

1. Receive suggestion (e.g., "change `z.treeifyError()` to `error.format()`")
2. Use `ref_search_documentation` to verify the correct API for the library version
3. Apply only verified fixes; reject incorrect suggestions

**Example verification:**

```
# CodeRabbit suggests: "z.url() doesn't exist, use z.string().url()"
# Before applying, verify:
ref_search_documentation("zod 4 z.url standalone string validation")
# Docs confirm z.url() IS correct for Zod 4 - reject the suggestion
```

Keep verifications minimal (one search when possible) to avoid overhead.
