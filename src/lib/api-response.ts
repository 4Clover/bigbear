import { NextResponse } from 'next/server'

export const apiError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status })

export const apiUnauthorized = () => apiError('Unauthorized', 401)
