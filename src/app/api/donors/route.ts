import { fetchAllDonorsWithDetails } from '@/lib/monday'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const donors = await fetchAllDonorsWithDetails()
    return NextResponse.json({ donors, lastUpdated: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
