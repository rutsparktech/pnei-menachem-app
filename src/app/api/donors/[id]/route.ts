import { connection } from 'next/server'
import { fetchAllDonorsWithDetails } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection()
  try {
    const { id } = await params
    const donors = await fetchAllDonorsWithDetails()
    const donor = donors.find((d) => d.id === id)
    if (!donor) return Response.json({ error: 'תורם לא נמצא' }, { status: 404 })
    return Response.json(donor)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
