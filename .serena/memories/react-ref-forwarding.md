# React Ref Forwarding Pattern

## Problem
When creating reusable form components (Input, Select, Textarea, etc.), refs need to be properly forwarded to the underlying DOM element. Declaring `ref` as a regular prop in the interface does NOT work correctly with React's ref forwarding system.

## Incorrect Pattern
```typescript
// DON'T DO THIS - ref won't work properly with useRef hooks
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>
}

export const Select = ({ ref, ...props }: SelectProps) => {
  return <select ref={ref} {...props} />
}
```

## Correct Pattern
```typescript
// DO THIS - use forwardRef
import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, ...props }, ref) => {
    return <select ref={ref} {...props} />
  }
)
Select.displayName = 'Select'
```

## Key Points
1. Use `forwardRef<ElementType, PropsType>()` wrapper
2. Remove `ref` from the interface - it's handled by forwardRef
3. Ref comes as second argument to the render function: `(props, ref)`
4. Always set `displayName` for better debugging in React DevTools
5. This pattern works with all form elements: input, select, textarea, button, etc.
