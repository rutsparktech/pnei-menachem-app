import { auth } from '@/auth'
import { fetchAllDonorsWithDetails } from '@/lib/monday'
import { NextResponse, connection } from 'next/server'

export async function GET() {
  await connection()
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const donors = await fetchAllDonorsWithDetails()
    return NextResponse.json({ donors, lastUpdated: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
