# Environment Variables

Source of truth: `src/lib/env.ts` (Zod-validated at startup).

All env vars are accessed via the `env()` singleton — never use `process.env` directly.

<!-- AUTO-GENERATED:env -->

## Required

| Variable                | Description                                    | Validation                                         |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string (Neon serverless) | Non-empty string                                   |
| `AUTH_SECRET`           | NextAuth session encryption secret             | Non-empty string                                   |
| `AUTH_RESEND_KEY`       | Resend API key for passwordless email auth     | Non-empty string                                   |
| `RESEND_FROM_EMAIL`     | Sender email for auth emails                   | Valid email format                                 |
| `STRIPE_SECRET_KEY`     | Stripe API secret key                          | Must start with `sk_`                              |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret                  | Must start with `whsec_`                           |
| `ICAL_SECRET`           | Bearer token for iCal endpoint                 | Min 16 characters                                  |
| `CRON_SECRET`           | Bearer token for cron endpoints                | Min 16 characters (must differ from `ICAL_SECRET`) |
| `OWNER_EMAIL`           | Property owner email address                   | Valid email format                                 |

## Optional

| Variable                | Description                                 | Validation           |
| ----------------------- | ------------------------------------------- | -------------------- |
| `AUTH_URL`              | NextAuth base URL (auto-detected on Vercel) | Valid URL (optional) |
| `NEXT_PUBLIC_APP_URL`   | Public app URL                              | Valid URL (optional) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token                   | String (optional)    |

## Optional Groups (all-or-nothing)

### Twilio SMS

If any Twilio var is set, all three must be set together.

| Variable              | Description                | Validation                    |
| --------------------- | -------------------------- | ----------------------------- |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID         | Must start with `AC`          |
| `TWILIO_AUTH_TOKEN`   | Twilio auth token          | Min 32 characters             |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number | E.164 format (`+15551234567`) |

### Google OAuth

If either `AUTH_GOOGLE_ID` or `AUTH_GOOGLE_SECRET` is set, both must be set.

| Variable                  | Description                                   | Validation                  |
| ------------------------- | --------------------------------------------- | --------------------------- |
| `AUTH_GOOGLE_ID`          | Google OAuth client ID                        | Non-empty string            |
| `AUTH_GOOGLE_SECRET`      | Google OAuth client secret                    | Non-empty string            |
| `AUTHORIZED_ADMIN_EMAILS` | Comma-separated admin emails for Google login | Non-empty string (optional) |

### Upstash Redis (Rate Limiting)

Falls back to in-memory rate limiting if not set.

| Variable                   | Description                 | Validation           |
| -------------------------- | --------------------------- | -------------------- |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST endpoint | Valid URL (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token    | String (optional)    |

<!-- /AUTO-GENERATED:env -->

## Local Development

For local dev with Docker Compose (`pnpm db:up`):

```
DATABASE_URL=postgresql://dev:dev@localhost:5432/grizzly_dev
```
