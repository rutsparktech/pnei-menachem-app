import { fetchDonations, createDonation } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export const revalidate = 300

export async function GET(request: NextRequest) {
  try {
    const donorId = request.nextUrl.searchParams.get('donorId') ?? undefined
    const donations = await fetchDonations(donorId)
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
