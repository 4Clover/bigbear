/**
 * Base error class for application-specific errors.
 * Provides structured error handling with codes and status codes.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Thrown when user is not authenticated or lacks required permissions.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Thrown when user lacks specific permissions for an action.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Thrown when a requested resource cannot be found.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Thrown when input validation fails.
 */
export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string>[]) {
    super('VALIDATION_ERROR', message, 400)
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when there's a conflict with existing data (e.g., duplicate).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError
}
