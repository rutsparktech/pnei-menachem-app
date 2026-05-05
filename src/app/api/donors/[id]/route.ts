import type { NextRequest } from 'next/server'

export const revalidate = 300

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { donors } = await fetch(`${getBaseUrl()}/api/donors`, {
      next: { revalidate: 300 },
    }).then((r) => r.json())
    const donor = donors.find((d: { id: string }) => d.id === id)
    if (!donor) return Response.json({ error: 'תורם לא נמצא' }, { status: 404 })
    return Response.json(donor)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
