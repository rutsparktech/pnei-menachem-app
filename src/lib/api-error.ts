const isDev = process.env.NODE_ENV === 'development'

export function apiError(err: unknown, context: string): Response {
  console.error(`[${context}]`, err instanceof Error ? err.message : err)
  return Response.json(
    { error: isDev ? (err instanceof Error ? err.message : String(err)) : 'שגיאת שרת. נסה שוב מאוחר יותר.' },
    { status: 500 }
  )
}
