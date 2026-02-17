# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-16
**Commit:** e53f706
**Branch:** dev

## OVERVIEW

Short-term rental property management (Big Bear cabin). Next.js 16 + TypeScript + Prisma/PostgreSQL + Stripe + Auth.js. Deployed on Vercel. 4 user roles: OWNER, GUEST, WORKER, ACCOUNTANT.

## STRUCTURE

```
grizzly/
├── src/
│   ├── actions/          # Server actions by domain (6 files) → see actions/AGENTS.md
│   ├── app/              # App Router routes (4 route groups) → see app/AGENTS.md
│   ├── components/       # Domain-organized components (56 files) → see components/AGENTS.md
│   ├── lib/              # Infrastructure layer (14 modules) → see lib/AGENTS.md
│   └── types/            # Shared types (pagination, next-auth extensions)
├── tests/                # Vitest test suite (32 files) → see tests/AGENTS.md
├── prisma/               # Schema (425 lines) + migrations + seed → see prisma/AGENTS.md
└── src/proxy.ts          # Global route protection (Next.js 16 proxy pattern)
```

## WHERE TO LOOK

| Task                | Location                              | Notes                                          |
| ------------------- | ------------------------------------- | ---------------------------------------------- |
| Add protected route | `src/app/owner/` or `src/app/worker/` | proxy.ts auto-protects; add layout guard too   |
| Add server action   | `src/actions/{domain}.ts`             | Auth guard first, Zod validate, revalidatePath |
| Add UI component    | `src/components/{domain}/`            | Custom design system, not shadcn               |
| Add API endpoint    | `src/app/api/{feature}/route.ts`      | Rate limit public endpoints, Bearer for cron   |
| Add Prisma model    | `prisma/schema.prisma`                | Run `pnpm db:migrate` after                    |
| Change env vars     | `src/lib/env.ts`                      | Zod-validated; fails fast at startup           |
| Mock for tests      | `tests/__mocks__/`                    | Prisma, auth, resend, twilio, upstash          |
| Add test fixtures   | `tests/fixtures/`                     | Factory pattern with counter-based IDs         |

## CONVENTIONS

- **No semicolons**, single quotes, 100-char line width (Prettier)
- **`import type`** for type-only imports (eslint enforced)
- **Underscore prefix** for intentionally unused vars (`_error`, `_req`)
- **Decimal→number**: Prisma client extension auto-converts; never serialize raw Decimals
- **Lazy-load expensive clients**: Stripe (Proxy pattern), Twilio (conditional init)
- **Non-blocking notifications**: Always `.catch(() => {})` on notification sends
- **Auth guard order**: `assertOwner()` → Zod validate → Prisma query → revalidatePath

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** use `as any`, `@ts-ignore`, `@ts-expect-error` in production code (tests OK with `as any`)
- **NEVER** use `z.treeifyError()` — use `error.flatten().fieldErrors` (Zod 4)
- **NEVER** pass raw Prisma Decimal to client components
- **NEVER** skip auth guards in server actions (they create public HTTP endpoints)
- **NEVER** use `<img>` — use Next.js `<Image>` (1 exception: ReceiptGallery)
- **NEVER** suppress floating promises — await, void, or .catch()
- **NEVER** use non-null assertions (`!`) — proper null checks required

## COMMANDS

```bash
pnpm dev                  # Dev server
pnpm build                # Production build
pnpm lint                 # ESLint (strict + stylistic TypeScript)
pnpm typecheck            # tsc --noEmit
pnpm test:run             # Vitest single run
pnpm test:coverage        # Coverage report
pnpm db:migrate           # Prisma migrations (dev)
pnpm db:seed              # Seed database
pnpm db:up                # Docker PostgreSQL
```

## NOTES

- **3-layer auth**: proxy.ts (global) → layout guards (route group) → assertOwner/assertWorker (action)
- **No middleware.ts**: proxy.ts replaces it (Next.js 16 pattern)
- **No CI/CD pipeline**: Vercel auto-deploys from git; no GitHub Actions
- **No error/loading/not-found files**: Error handling is inline; loading via client state
- **React Compiler enabled**: `reactCompiler: true` in next.config.ts
- **Tailwind CSS v4**: Uses `@tailwindcss/postcss` plugin
- **Custom color palette**: forest/wood/stone tokens (not default Tailwind colors)
- **errors.ts defined but unused**: Custom error classes exist but actions throw generic Error
- **Vercel Cron**: calendar-sync (6h), reminders (daily 10am UTC) — need CRON_SECRET
- **PDF reports**: `@react-pdf/renderer` for AnnualReport, MonthlyReport, ScheduleE
