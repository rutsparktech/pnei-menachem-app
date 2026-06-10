import { fetchAllDonorsWithDetails } from '@/lib/monday'
import { NextResponse, connection } from 'next/server'
import { apiError } from '@/lib/api-error'

export async function GET() {
  await connection()
  try {
    const donors = await fetchAllDonorsWithDetails()
    return NextResponse.json({ donors, lastUpdated: new Date().toISOString() })
  } catch (err) {
    return apiError(err, 'GET /api/donors')
  }
}
