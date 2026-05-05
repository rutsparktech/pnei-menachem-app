import { createDonation } from '@/lib/monday'
import type { NextRequest } from 'next/server'

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
    const donations = (donors as Array<{ name: string; donations: unknown[] }>).flatMap((d) =>
      d.donations.map((don) => ({ ...(don as object), donorName: d.name }))
    )
    return Response.json(donations)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donorId, donorName, amount, currency, date, purpose, paymentMethod, notes } = body

    if (!donorId || !amount || !date || !purpose) {
      return Response.json({ error: 'שדות חובה חסרים' }, { status: 400 })
    }

    const id = await createDonation({
      donorId,
      donorName,
      amount: parseFloat(amount),
      currency: currency || '₪',
      date,
      purpose,
      paymentMethod: paymentMethod || '',
      notes: notes || '',
    })

    return Response.json({ id }, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
