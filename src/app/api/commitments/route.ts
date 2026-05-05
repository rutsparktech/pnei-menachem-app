import { fetchAllDonorsWithDetails } from '@/lib/monday'

export async function GET() {
  try {
    const donors = await fetchAllDonorsWithDetails()
    const commitments = donors.flatMap((d) =>
      d.commitments.map((com) => ({ ...com, donorName: d.name }))
    )
    return Response.json(commitments)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
