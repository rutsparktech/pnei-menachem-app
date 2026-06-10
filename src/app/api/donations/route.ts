import { connection } from 'next/server'
import { createDonation, fetchAllDonorsWithDetails } from '@/lib/monday'
import { apiError } from '@/lib/api-error'
import type { NextRequest } from 'next/server'

const VALID_CURRENCIES = ['₪', '$', '€', '£']
const MAX_NOTE_LENGTH = 1000

function validateBody(body: Record<string, unknown>): string[] {
  const errors: string[] = []
  if (!body.donorId || typeof body.donorId !== 'string' || !/^\d+$/.test(body.donorId))
    errors.push('donorId חייב להיות מספר')
  const amount = Number(body.amount)
  if (!body.amount || isNaN(amount) || amount <= 0 || amount > 10_000_000)
    errors.push('amount לא תקין')
  if (!body.date || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    errors.push('date חייב להיות YYYY-MM-DD')
  if (!body.purpose || typeof body.purpose !== 'string')
    errors.push('purpose חובה')
  if (body.currency && !VALID_CURRENCIES.includes(body.currency as string))
    errors.push('currency לא חוקי')
  if (body.notes && (typeof body.notes !== 'string' || body.notes.length > MAX_NOTE_LENGTH))
    errors.push(`notes לא יעלה על ${MAX_NOTE_LENGTH} תווים`)
  if (body.donorName && (typeof body.donorName !== 'string' || body.donorName.length > 200))
    errors.push('donorName ארוך מדי')
  return errors
}

export async function GET() {
  await connection()
  try {
    const donors = await fetchAllDonorsWithDetails()
    const donations = donors.flatMap((d) =>
      d.donations.map((don) => ({ ...don, donorName: d.name }))
    )
    return Response.json(donations)
  } catch (err) {
    return apiError(err, 'GET /api/donations')
  }
}

export async function POST(request: NextRequest) {
  await connection()
  try {
    const body = await request.json()
    const errors = validateBody(body)
    if (errors.length > 0) {
      return Response.json({ error: 'שדות לא תקינים', details: errors }, { status: 400 })
    }

    const { donorId, donorName, amount, currency, date, purpose, paymentMethod, notes } = body
    const id = await createDonation({
      donorId,
      donorName: donorName ?? '',
      amount: parseFloat(amount),
      currency: currency || '₪',
      date,
      purpose,
      paymentMethod: paymentMethod || '',
      notes: notes || '',
    })

    return Response.json({ id }, { status: 201 })
  } catch (err) {
    return apiError(err, 'POST /api/donations')
  }
}
