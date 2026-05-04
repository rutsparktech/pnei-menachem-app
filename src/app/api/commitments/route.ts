import { fetchCommitments } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const donorId = request.nextUrl.searchParams.get('donorId') ?? undefined
    const commitments = await fetchCommitments(donorId)
    return Response.json(commitments)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
