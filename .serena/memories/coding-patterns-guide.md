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

Next.js `dynamic()` loading function receives no props. Use a mounted-state pattern when skeleton needs props.

**Anti-pattern:**

```typescript
// loading callback CANNOT receive props - this won't work
export const Chart = dynamic(
  () => Promise.resolve(ChartInner),
  {
    ssr: false,
    loading: () => <Skeleton title={???} />, // No access to props here
  }
)
```

**Correct pattern (mounted state):**

```typescript
// Use useState/useEffect to detect client mount
export function Chart(props: Readonly<ChartProps>) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <ChartSkeleton title={props.title} /> // Props accessible!
  }

  return <ChartInner {...props} />
}
```

This pattern:
- Avoids hydration mismatches (like `dynamic` with `ssr: false`)
- Allows passing props to the skeleton component
- Renders skeleton on server/initial client, then swaps to real component

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
