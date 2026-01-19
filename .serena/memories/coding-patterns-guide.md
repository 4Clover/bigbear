# Coding Patterns Guide

## Conditional Logic Simplification

Avoid redundant ternaries where both branches return the same value.

**Anti-pattern:**

```typescript
status: refund.type === 'full' ? 'CANCELLED' : 'CANCELLED',
```

**Correct pattern:**

```typescript
status: 'CANCELLED',
```

---

## Unused Function Parameters

Remove unused parameters or implement their functionality. Prefixing with `_` signals intentional non-use but the parameter should still serve a purpose (e.g., maintaining API compatibility).

**Anti-pattern:**

```typescript
export const blockDates = async (
  startDate: Date,
  endDate: Date,
  reason?: string,
  _notes?: string // Never used, no clear purpose
) => {
  // _notes is ignored entirely
}
```

**Correct pattern:**

```typescript
// Option A: Remove if not needed
export const blockDates = async (
  startDate: Date,
  endDate: Date,
  reason?: string
) => { ... }

// Option B: Implement if needed (ASK THE USER TO VERIFY)
export const blockDates = async (
  startDate: Date,
  endDate: Date,
  reason?: string,
  notes?: string
) => {
  await prisma.blockedDate.create({
    data: { startDate, endDate, reason, notes },
  })
}
```

---

## Dynamic Import Loading Props

Next.js `dynamic()` loading function receives no props. Pass data through wrapper components.

**Anti-pattern:**

```typescript
export const Chart = dynamic(
  () => Promise.resolve(ChartInner),
  {
    loading: ({ title }: { title?: string }) => <Skeleton title={title} />,
  }
)
```

**Correct pattern:**

```typescript
export const Chart = dynamic(
  () => Promise.resolve(ChartInner),
  {
    ssr: false,
    loading: () => <Skeleton />,
  }
)

// If title needed in skeleton, wrap the dynamic component
export const ChartWithTitle = ({ title, ...props }) => (
  <div>
    {title && <h3>{title}</h3>}
    <Chart {...props} />
  </div>
)
```

---

## Scaffolded Features Detection

When implementing features or modifying functions with `_` prefixed parameters, check for deferred/scaffolded code.

**Scaffolding comment pattern:**
```
#|--------------------------------|
#| %%% XYZ SCAFFOLDING %%%%%%%%%%%|
#| TODO: Implement when relevant. |
#|--------------------------------|
```

**Workflow:**
1. Before modifying code, search for related scaffolding:
   ```
   search_for_pattern with substring_pattern="%%% .* SCAFFOLDING"
   ```
2. Check if scaffolded code relates to the current task
3. If yes, implement it and remove the scaffolding comment
4. If no, leave it for future work

**When to add scaffolding:**
- Parameters that will be used in a future feature
- Functions stubbed out for planned functionality
- Code paths that need implementation but aren't blocking
