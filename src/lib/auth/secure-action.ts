import { z } from 'zod'
import { auth } from '@/lib/auth'
import type { UserRole } from '@prisma/client'
import type { Session } from 'next-auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SecureActionConfig<TSchema extends z.ZodType> {
  /** Role(s) allowed to execute this action */
  roles: UserRole | UserRole[]
  /** Optional Zod schema for input validation */
  schema?: TSchema
}

interface ActionContext<TData = undefined> {
  session: Session
  data: TData
}

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const checkAuth = async (roles: UserRole | UserRole[]): Promise<Session> => {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  return session
}

const extractValidationError = (error: z.ZodError): string => {
  const treeified = z.treeifyError(error)
  const properties =
    (treeified as { properties?: Record<string, { errors: string[] } | undefined> }).properties ??
    {}
  const firstError = Object.values(properties).find((entry) => entry && entry.errors.length > 0)
  return firstError?.errors[0] ?? 'Invalid input'
}

// ---------------------------------------------------------------------------
// secureAction — for direct server action calls
// ---------------------------------------------------------------------------

/**
 * Wraps a server action with auth guard and optional Zod validation.
 *
 * @example
 * ```ts
 * export const deleteImage = secureAction(
 *   { roles: 'OWNER', schema: idSchema },
 *   async ({ session, data }) => {
 *     await prisma.galleryImage.delete({ where: { id: data.id } })
 *     return { success: true }
 *   }
 * )
 * ```
 */
export function secureAction<TSchema extends z.ZodType, TResult>(
  config: SecureActionConfig<TSchema> & { schema: TSchema },
  handler: (ctx: ActionContext<z.infer<TSchema>>) => Promise<ActionResult<TResult>>
): (input: unknown) => Promise<ActionResult<TResult>>

export function secureAction<TResult>(
  config: SecureActionConfig<never> & { schema?: undefined },
  handler: (ctx: ActionContext) => Promise<ActionResult<TResult>>
): () => Promise<ActionResult<TResult>>

export function secureAction<TSchema extends z.ZodType, TResult>(
  config: SecureActionConfig<TSchema>,
  handler: (ctx: ActionContext<z.infer<TSchema>>) => Promise<ActionResult<TResult>>
): (input?: unknown) => Promise<ActionResult<TResult>> {
  return async (input?: unknown) => {
    const session = await checkAuth(config.roles)

    if (config.schema) {
      const validated = config.schema.safeParse(input)
      if (!validated.success) {
        return { success: false, error: extractValidationError(validated.error) }
      }
      return handler({ session, data: validated.data })
    }

    return handler({ session, data: undefined as z.infer<TSchema> })
  }
}
