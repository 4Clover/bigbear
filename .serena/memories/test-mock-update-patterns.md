# Test Mock Update Patterns

When modifying Prisma schemas or optimizing queries, test mocks must be updated accordingly.

---

## Schema Changes Require Mock Updates

When adding new fields to Prisma models, **all test mocks** creating objects of that type must include the new field. TypeScript catches this:

```
Property 'notes' is missing in type '{ id: string; ... }' but required in type '{ ...; notes: string | null; ... }'
```

### Example: Adding `notes` field to `BlockedDate`

```typescript
// ❌ Before - type error
const mockBlocked = {
  id: 'blocked-1',
  startDate: new Date(),
  endDate: new Date(),
  reason: 'Maintenance',
  source: 'manual',
  externalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ✅ After - include the new field
const mockBlocked = {
  id: 'blocked-1',
  startDate: new Date(),
  endDate: new Date(),
  reason: 'Maintenance',
  notes: null,           // ADD THIS
  source: 'manual',
  externalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
```

### Search Pattern

```bash
grep -r "BlockedDate\|blockedDate" tests/ --include="*.test.ts"
```

---

## Query Optimization Breaks Mock Setups

When optimizing N+1 queries (multiple queries → single query), tests with multiple `mockResolvedValueOnce` calls break.

### Example: Monthly Breakdown Query

**Before (N+1 - 12 queries):**
```typescript
for (let month = 0; month < 12; month++) {
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  })
}

// Test mock: 12 separate mocks
for (let month = 0; month < 12; month++) {
  prismaMock.transaction.findMany.mockResolvedValueOnce([
    createMockTransaction(`tx-${month}`, ...)
  ])
}
```

**After (Optimized - 1 query):**
```typescript
const transactions = await prisma.transaction.findMany({
  where: { date: { gte: yearStart, lte: yearEnd } },
})

// Test mock: single mock with all data
const allTransactions = monthlyIncomes.map((income, month) =>
  createMockTransaction(`tx-${month}`, 'INCOME', income, new Date(2024, month, 15), category)
)
prismaMock.transaction.findMany.mockResolvedValueOnce(allTransactions)
```

### Search Pattern

```bash
grep -r "findMany.mockResolvedValueOnce" tests/ --include="*.test.ts" -A 2
```

Look for loops or multiple sequential mocks - these indicate N+1 test setups.

---

## Common Test Locations

After schema/query changes, check:
- `tests/data-paths/*.test.ts` - Integration/workflow tests
- `tests/unit/actions/*.test.ts` - Server action unit tests
- `tests/unit/lib/*.test.ts` - Library unit tests
- `tests/patterns/*.test.ts` - Pattern tests

Run `pnpm typecheck` to catch all missing fields before running tests.
