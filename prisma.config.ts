import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load env files in Next.js order (later files override earlier ones)
// 1. .env.local (production secrets)
// 2. .env.development.local (local dev overrides - only in development)
config({ path: '.env.local' })
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.development.local', override: true })
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  datasource: {
    // Use DIRECT_URL for migrations (non-pooled connection)
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
