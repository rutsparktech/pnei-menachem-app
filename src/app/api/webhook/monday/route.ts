import type { NextRequest } from 'next/server'

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.challenge) return Response.json({ challenge: body.challenge })
    await fetch(`${getBaseUrl()}/api/revalidate`, { method: 'POST' })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
