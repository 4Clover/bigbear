/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts up
 * Used for environment validation to fail fast on missing/invalid env vars
 */
export const register = async () => {
  // Only validate in Node.js runtime (not Edge)
  // Edge runtime may have different env vars and validation requirements
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env')
    validateEnv()
    console.log('✅ Environment variables validated successfully')
  }
}
