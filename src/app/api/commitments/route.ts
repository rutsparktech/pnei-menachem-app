export const revalidate = 300

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function GET() {
  try {
    const { donors } = await fetch(`${getBaseUrl()}/api/donors`, {
      next: { revalidate: 300 },
    }).then((r) => r.json())
    const commitments = (donors as Array<{ name: string; commitments: unknown[] }>).flatMap((d) =>
      d.commitments.map((com) => ({ ...(com as object), donorName: d.name }))
    )
    return Response.json(commitments)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
