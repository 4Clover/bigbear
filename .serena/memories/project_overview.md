# Big Bear Cabin - Project Overview

## Purpose
Short-term rental property management system for a Big Bear cabin. Manages bookings, guest communications, worker tasks, financial tracking, and maintenance.

## Tech Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM (Neon serverless)
- **Auth**: NextAuth v5 (Auth.js) with Resend email provider
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel
- **Testing**: Vitest with happy-dom

## User Roles
- `OWNER` - Full dashboard access
- `GUEST` - Booking capabilities
- `WORKER` - Task management
- `ACCOUNTANT` - Financial access

## Key Directories
- `src/app/` - Route groups: (public), (auth), owner/, worker/, api/
- `src/actions/` - Server actions for data mutations
- `src/components/` - UI and domain components
- `src/lib/` - Shared utilities (prisma, auth, stripe, etc.)
- `tests/` - Unit and integration tests
