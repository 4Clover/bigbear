# COMPONENTS

56 components organized by domain. Custom design system (NOT shadcn). Tailwind CSS v4 with forest/wood/stone color tokens.

## STRUCTURE

| Domain         | Count | Purpose                                                                           |
| -------------- | ----- | --------------------------------------------------------------------------------- |
| `booking/`     | 4     | Guest booking flow (calendar, guest form, pricing, addon selector)                |
| `charts/`      | 3     | Recharts visualizations (revenue, trends, category breakdown)                     |
| `finance/`     | 7     | Expense management (forms, tables, receipt upload/gallery, filters)               |
| `layout/`      | 2     | Header (client, mobile menu) + Footer (server)                                    |
| `maintenance/` | 6     | Owner-side job management (forms, lists, quote/completion review)                 |
| `owner/`       | 9     | Owner dashboard (booking table, calendar, block dates, nav, notifications)        |
| `pdf/`         | 3     | `@react-pdf/renderer` documents (annual, monthly, Schedule E)                     |
| `reports/`     | 6     | Report display + export buttons (monthly, annual, Schedule E, CSV, PDF)           |
| `ui/`          | 9     | Primitives: Button, Card, Input, Select, Textarea, Badge, Pagination, ThemeToggle |
| `worker/`      | 7     | Worker portal (job cards, quote/completion forms, timeslot picker, photo upload)  |
| Root           | 1     | `ThemeProvider.tsx` (next-themes wrapper)                                         |

## WHERE TO LOOK

| Task                  | Location    | Notes                                                                  |
| --------------------- | ----------- | ---------------------------------------------------------------------- |
| Add form component    | `{domain}/` | Use `'use client'`, useTransition for async, server action direct call |
| Add display component | `{domain}/` | Prefer server component unless interactive                             |
| Add chart             | `charts/`   | Dynamic import with `ssr: false`; theme-aware colors                   |
| Add PDF report        | `pdf/`      | Uses `@react-pdf/renderer`; rendered server-side via API route         |
| Add UI primitive      | `ui/`       | Custom; use forwardRef for form inputs; match existing variants        |

## CONVENTIONS

- **Client vs Server**: Forms, tables with actions, nav = `'use client'`. Stats displays, cards = server
- **Server actions**: Import and call directly from client components (no API wrapper)
- **Form pattern**: `useState` for fields → `useTransition` for submit → server action → `onSuccess` callback
- **Loading states**: `isPending` from useTransition; disabled buttons; "Submitting..." text
- **Error display**: Red box with error message; `console.error` for debug
- **Charts**: Dynamic import to prevent SSR hydration issues; mounted state check
- **Pagination**: Components accept `{ data, total, page, pageSize, totalPages }` shape
- **Icons**: `lucide-react` throughout (not heroicons, not radix icons)
- **Theme**: `dark:` prefix for dark mode; `next-themes` for toggle
- **Uploads**: Direct Vercel Blob upload from client; pass URL to server action

## ANTI-PATTERNS

- **NEVER** use `<img>` — use `<Image>` from next/image (1 exception: ReceiptGallery)
- **NEVER** add shadcn/ui — project uses custom components
- **NEVER** use `alert()` for user feedback (legacy pattern; prefer proper error display)
- **NEVER** pass async function to `onClick` directly — wrap: `onClick={() => { void save() }}`
