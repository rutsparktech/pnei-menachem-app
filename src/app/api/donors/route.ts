import { fetchDonors } from '@/lib/monday'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 300

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.toLowerCase()
    const donors = await fetchDonors()
    const filtered = q ? donors.filter((d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q)) : donors
    return NextResponse.json({ donors: filtered, lastUpdated: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
