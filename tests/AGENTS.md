# TEST SUITE

35 test files (~12,800 lines). Vitest + happy-dom + vitest-mock-extended. Globals enabled (no imports needed for describe/it/expect).

**Three-layer testing strategy**: unit (function-level) → data-paths (workflow-level) → patterns (schema-level).

## STRUCTURE

```
tests/
├── __mocks__/              # Module mocks
│   ├── prisma.ts          # mockDeep<PrismaClient> singleton
│   ├── auth.ts            # createMockSession(), createMockUser()
│   ├── resend.ts          # MockResend class, mockSend, resetResendMocks()
│   ├── twilio.ts          # mockTwilio factory, mockCreate, resetTwilioMocks()
│   └── upstash.ts         # MockRatelimit, simulateRateLimitExceeded()
├── fixtures/               # Data factories (counter-based IDs)
│   ├── user.factory.ts    # createUserFixture, createOwnerFixture, createWorkerFixture
│   ├── booking.factory.ts # createBookingFixture, createConfirmedBookingFixture, Decimal export
│   └── maintenance.factory.ts # createMaintenanceJobFixture
├── unit/
│   ├── lib/               # Tests for src/lib/ modules (11 files)
│   ├── actions/           # Tests for src/actions/ (5 files)
│   └── api/               # Tests for API routes (1 file)
├── data-paths/            # Integration-style workflow tests (14 files) — test complete data flows
└── patterns/              # Database pattern tests (4 files) — state machines, cascades, constraints
```

## WHERE TO LOOK

| Task                  | Location                        | Notes                                          |
| --------------------- | ------------------------------- | ---------------------------------------------- |
| Add unit test for lib | `unit/lib/{module}.test.ts`     | Mock Prisma + external services                |
| Add action test       | `unit/actions/{domain}.test.ts` | Mock auth guards + Prisma                      |
| Add API route test    | `unit/api/{route}.test.ts`      | Mock auth + request/response                   |
| Add workflow test     | `data-paths/{flow}.test.ts`     | Test end-to-end data transformations           |
| Add pattern test      | `patterns/{pattern}.test.ts`    | Validate state machines, cascades, constraints |
| Add mock              | `__mocks__/{service}.ts`        | Export mock + reset function                   |
| Add fixture           | `fixtures/{domain}.factory.ts`  | Counter-based IDs; export reset function       |

## CONVENTIONS

- **Mock setup**: `vi.mock('@/lib/prisma', () => import('../../__mocks__/prisma'))` at top of file
- **Reset in beforeEach**: `mockReset(prismaMock)` + `resetXxxCounter()` + `resetXxxMocks()`
- **Auth mocking**: `vi.mock('@/lib/auth/guards', () => ({ assertOwner: vi.fn().mockResolvedValue(undefined) }))`
- **Dynamic import**: `const { myAction } = await import('@/actions/domain')` after mocks
- **Fixture overrides**: `createBookingFixture({ status: 'CONFIRMED', guestId: 'custom' })`
- **Decimal in tests**: Import `Decimal` from booking factory; use `as any` for Prisma mock Decimals (test-only)
- **Naming**: `describe('Feature')` → `describe('behavior')` → `it('should X when Y')`
- **No imports for globals**: `describe`, `it`, `expect`, `vi`, `beforeEach` — all global

## ANTI-PATTERNS

- **NEVER** use `as any` outside test files
- **NEVER** delete failing tests to make suite pass
- **NEVER** skip `mockReset(prismaMock)` in beforeEach — causes test pollution
- **NEVER** forget `resetXxxCounter()` — fixture IDs will leak between tests
