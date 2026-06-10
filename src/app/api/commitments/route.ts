import { connection } from 'next/server'
import { fetchAllDonorsWithDetails } from '@/lib/monday'
import { apiError } from '@/lib/api-error'

export async function GET() {
  await connection()
  try {
    const donors = await fetchAllDonorsWithDetails()
    const commitments = donors.flatMap((d) =>
      d.commitments.map((com) => ({ ...com, donorName: d.name }))
    )
    return Response.json(commitments)
  } catch (err) {
    return apiError(err, 'GET /api/commitments')
  }
}
