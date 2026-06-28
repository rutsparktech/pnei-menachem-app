import { connection } from 'next/server'
import { auth } from '@/auth'
import { getDonorById } from '@/lib/api'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection()
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const donor = await getDonorById(id)
    if (!donor) return Response.json({ error: 'תורם לא נמצא' }, { status: 404 })
    return Response.json(donor)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
