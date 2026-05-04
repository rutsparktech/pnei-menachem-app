import { fetchDonorDetail } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await fetchDonorDetail(id)
    if (!result) return Response.json({ error: 'תורם לא נמצא' }, { status: 404 })
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
