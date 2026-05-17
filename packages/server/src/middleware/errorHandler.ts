import { type ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err)
  const status = (err as { status?: number }).status ?? 500
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : String((err as Error).message ?? 'Unknown error')
  res.status(status).json({ data: null, error: message })
}
