# Code Style & Conventions

## TypeScript
- Strict mode with `noUncheckedIndexedAccess`
- Use `import type` for type-only imports
- No non-null assertions (use proper null checks)
- Exhaustive switch statements

## Patterns
- Server Actions for data mutations (validate with Zod, auth with guards)
- React 19: `useActionState` for forms, `useOptimistic` for instant UI
- Path alias: `@/*` maps to `src/*`

## Lint Rules (typescript-eslint strict)
- No floating promises (await or void)
- No async event handlers directly (wrap with non-async)
- Template literals: only strings/numbers
- Unused vars: prefix with underscore

## Security
- Always validate auth first in server actions
- Validate all input with Zod
- Filter sensitive fields when returning data (DTOs)
