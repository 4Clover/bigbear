# Contributing

## Prerequisites

- Node.js (managed via `mise`)
- `pnpm` package manager
- Docker (for local PostgreSQL)

## Setup

```bash
# Install dependencies
pnpm install

# Start local database
pnpm db:up

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start dev server
pnpm dev
```

## Available Scripts

<!-- AUTO-GENERATED:scripts -->

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `pnpm dev`             | Start Next.js development server          |
| `pnpm build`           | Production build                          |
| `pnpm start`           | Start production server                   |
| `pnpm lint`            | Run ESLint                                |
| `pnpm lint:fix`        | Auto-fix lint issues                      |
| `pnpm format`          | Format all files with Prettier            |
| `pnpm format:check`    | Check formatting without writing          |
| `pnpm typecheck`       | TypeScript type check (`tsc --noEmit`)    |
| `pnpm test`            | Run Vitest in watch mode                  |
| `pnpm test:run`        | Single Vitest run                         |
| `pnpm test:coverage`   | Vitest with coverage report               |
| `pnpm db:generate`     | Generate Prisma client                    |
| `pnpm db:migrate`      | Run Prisma migrations (dev)               |
| `pnpm db:migrate:prod` | Deploy Prisma migrations (production)     |
| `pnpm db:seed`         | Seed database (`tsx prisma/seed.ts`)      |
| `pnpm db:studio`       | Open Prisma Studio GUI                    |
| `pnpm db:up`           | Start local PostgreSQL via Docker Compose |
| `pnpm db:down`         | Stop local PostgreSQL                     |
| `pnpm prepare`         | Install Husky git hooks                   |

<!-- /AUTO-GENERATED:scripts -->

## Testing

Tests live in `tests/` with this structure:

- `tests/unit/` - Unit tests for lib functions and server actions
- `tests/data-paths/` - Integration-style workflow tests
- `tests/patterns/` - Database pattern tests (state machines, cascades)
- `tests/__mocks__/` - Vitest mocks for Prisma, auth, external services

Prisma is mocked via `vitest-mock-extended`:

```typescript
import { prismaMock } from 'tests/__mocks__/prisma'
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
```

Run a specific test file:

```bash
pnpm test:run tests/unit/lib/calendar.test.ts
```

## Code Style

- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- **ESLint**: `strictTypeChecked` + `stylisticTypeChecked` from typescript-eslint
- **Prettier**: Enforced via lint-staged on commit
- **Imports**: Use `import type` for type-only imports
- **No `any`**: Use `unknown` and narrow safely
- **No semicolons**: Prettier enforces no-semicolons

Pre-commit hooks (Husky + lint-staged) auto-run:

- `eslint --fix` + `prettier --write` on `*.ts` / `*.tsx`
- `prettier --write` on `*.json` / `*.md` / `*.css`

## PR Process

1. Branch from `prod` (default branch)
2. Follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
3. Ensure `pnpm lint && pnpm typecheck && pnpm test:run` all pass
4. Open PR against `prod` with a summary and test plan
