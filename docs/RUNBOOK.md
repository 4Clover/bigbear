# Runbook

## Deployment

Deployed on **Vercel** with automatic deploys from the `prod` branch.

### Deploy Checklist

1. Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test:run`
2. If Prisma schema changed: production migration runs via `pnpm db:migrate:prod`
3. Merge PR to `prod` — Vercel auto-deploys

### Environment Variables

Set in Vercel project settings. See [docs/ENV.md](./ENV.md) for full reference.

## Infrastructure

| Service     | Purpose                      | Dashboard        |
| ----------- | ---------------------------- | ---------------- |
| Vercel      | Hosting, edge functions, ISR | Vercel dashboard |
| Neon        | PostgreSQL (serverless)      | Neon console     |
| Stripe      | Payment processing           | Stripe dashboard |
| Resend      | Transactional email (auth)   | Resend dashboard |
| Upstash     | Redis rate limiting          | Upstash console  |
| Vercel Blob | Image/file storage           | Vercel dashboard |
| Twilio      | SMS notifications (optional) | Twilio console   |

## Cron Jobs

| Endpoint                  | Schedule | Purpose                                        |
| ------------------------- | -------- | ---------------------------------------------- |
| `/api/cron/calendar-sync` | Periodic | Sync external iCal feeds, create blocked dates |
| `/api/cron/reminders`     | Periodic | Send booking reminders                         |

Protected by `CRON_SECRET` bearer token. Configured in Vercel cron settings (`vercel.json`).

## API Endpoints

| Endpoint                  | Method   | Auth         | Purpose                        |
| ------------------------- | -------- | ------------ | ------------------------------ |
| `/api/auth/[...nextauth]` | GET/POST | Public       | NextAuth authentication        |
| `/api/availability`       | GET      | Public       | Check date availability        |
| `/api/pricing`            | GET      | Public       | Get pricing for dates          |
| `/api/addons`             | GET      | Public       | List available add-ons         |
| `/api/contact`            | POST     | Public       | Contact form submission        |
| `/api/booking/inquiry`    | POST     | Public       | Booking inquiry                |
| `/api/booking/family`     | POST     | Auth         | Family booking                 |
| `/api/family/verify`      | POST     | Auth         | Family verification            |
| `/api/stripe/checkout`    | POST     | Auth         | Create Stripe checkout session |
| `/api/stripe/webhook`     | POST     | Stripe sig   | Stripe webhook handler         |
| `/api/calendar/ical`      | GET      | Bearer token | iCal feed export               |
| `/api/upload/gallery`     | POST     | Owner        | Gallery image upload           |
| `/api/upload/maintenance` | POST     | Worker       | Maintenance photo upload       |
| `/api/upload/receipts`    | POST     | Owner        | Receipt file upload            |
| `/api/upload/review`      | POST     | Auth         | Review photo upload            |
| `/api/reports/csv`        | GET      | Owner        | Export reports as CSV          |

## Common Issues

### Build Failures

```bash
# Type errors
pnpm typecheck   # Check for type errors
pnpm lint:fix    # Auto-fix lint issues

# Prisma client out of sync
pnpm db:generate # Regenerate Prisma client
```

### Database Issues

```bash
# Reset local database
pnpm db:down && pnpm db:up
pnpm db:migrate
pnpm db:seed

# Check migration status
npx prisma migrate status

# Open database GUI
pnpm db:studio
```

### Auth Issues

- **Email not sending**: Check `AUTH_RESEND_KEY` and `RESEND_FROM_EMAIL` in env
- **Session invalid**: Verify `AUTH_SECRET` matches across environments
- **Google login failing**: Ensure both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set

### Stripe Issues

- **Webhook not firing**: Verify `STRIPE_WEBHOOK_SECRET` matches the Stripe dashboard endpoint secret
- **Duplicate payments**: Check StripeEvent idempotency (webhook 3-state machine)

## Rollback

1. Identify the last known good deployment in Vercel dashboard
2. Use Vercel's "Promote to Production" on the good deployment
3. If database migration needs reverting: create a new down-migration in `prisma/migrations/`
