# Suggested Commands

## Development
```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
```

## Code Quality
```bash
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix lint issues
pnpm format       # Prettier formatting
pnpm typecheck    # TypeScript check (noEmit)
```

## Testing
```bash
pnpm test         # Vitest watch mode
pnpm test:run     # Single test run
pnpm test:coverage # Coverage report
```

## Database
```bash
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations (dev)
pnpm db:seed      # Seed database
pnpm db:studio    # Open Prisma Studio
```

## Task Completion Checklist
1. `pnpm lint:fix` - Fix all lint errors
2. `pnpm typecheck` - Verify types
3. `pnpm build` - Verify production build
