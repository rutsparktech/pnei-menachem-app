import { connection } from 'next/server'
import { auth } from '@/auth'
import { createDonation, fetchAllDonorsWithDetails } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export async function GET() {
  await connection()
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const donors = await fetchAllDonorsWithDetails()
    const donations = donors.flatMap((d) =>
      d.donations.map((don) => ({ ...don, donorName: d.name }))
    )
    return Response.json(donations)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  await connection()
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
