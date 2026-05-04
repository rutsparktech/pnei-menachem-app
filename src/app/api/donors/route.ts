import { fetchDonors } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export const revalidate = 60

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.toLowerCase()
    const donors = await fetchDonors()
    const filtered = q ? donors.filter((d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q)) : donors
    return Response.json(filtered)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
