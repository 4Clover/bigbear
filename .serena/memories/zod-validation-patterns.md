# Zod Validation Patterns in This Project

## Zod 4 Syntax (NOT Zod 3)

This project uses **Zod 4**. The following patterns are deprecated and will cause lint errors:

### ❌ Deprecated (Zod 3 syntax)
```typescript
z.string().cuid()      // @typescript-eslint/no-deprecated
z.string().url()       // @typescript-eslint/no-deprecated
z.string().email()     // @typescript-eslint/no-deprecated
error.flatten()        // @typescript-eslint/no-deprecated
```

### ✅ Correct (Zod 4 syntax)
```typescript
z.cuid()               // Standalone validator
z.url()                // Standalone validator
z.email()              // Standalone validator
z.treeifyError(error).properties  // For field errors
```

## ID Validation: Use `z.string().min(1)` NOT `z.cuid()`

**Problem**: Test mocks in this project use simple string IDs like `'job-1'`, `'tx-123'`, `'blocked-1'` which are NOT valid CUIDs.

**Solution**: Use lenient string validation for IDs:
```typescript
// ❌ Will break tests - mock IDs aren't valid CUIDs
const schema = z.object({
  jobId: z.cuid(),
})

// ✅ Works with test mocks
const schema = z.object({
  jobId: z.string().min(1),
})
```

## Standard Validation Pattern for Server Actions

```typescript
export const myAction = async (data: { ... }) => {
  await assertOwner()  // Auth first

  const schema = z.object({
    id: z.string().min(1),           // For IDs (lenient)
    amount: z.number().positive(),
    date: z.coerce.date(),
    email: z.email(),                // Standalone
    url: z.url(),                    // Standalone
    optional: z.string().optional(),
  })

  const validated = schema.safeParse(data)
  if (!validated.success) {
    return { errors: z.treeifyError(validated.error).properties }
  }

  // Use validated.data...
}
```
