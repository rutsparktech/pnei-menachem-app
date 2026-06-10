import { createHmac, timingSafeEqual } from 'crypto'
import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-monday-signature')
  const secret = process.env.MONDAY_WEBHOOK_SECRET

  if (secret) {
    if (!signature) return new Response('Forbidden', { status: 403 })
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    const ok = a.length === b.length && timingSafeEqual(a, b)
    if (!ok) return new Response('Forbidden', { status: 403 })
  }

  const body = JSON.parse(rawBody)
  if (body.challenge) return Response.json({ challenge: body.challenge })

  console.log('Monday webhook:', body.event?.type, body.event?.boardId)
  revalidateTag('monday-data')
  return Response.json({ ok: true })
}
