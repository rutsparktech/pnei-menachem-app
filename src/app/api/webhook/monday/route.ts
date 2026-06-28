import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    let body: Record<string, unknown>
    try { body = JSON.parse(rawBody) } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

    // Monday challenge handshake (no HMAC on first setup)
    if (body.challenge) return Response.json({ challenge: body.challenge })

    // Fail-closed: reject if secret not configured
    const secret = process.env.MONDAY_WEBHOOK_SECRET
    if (!secret) {
      console.error('[webhook] MONDAY_WEBHOOK_SECRET not configured — refusing request')
      return Response.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const signature = req.headers.get('x-monday-signature') ?? ''
    const sigHex = signature.startsWith('sha256=') ? signature.slice(7) : signature
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    let valid = false
    try {
      valid = sigHex.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sigHex, 'hex'), Buffer.from(expected, 'hex'))
    } catch { valid = false }
    if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 401 })

    const { event } = body as { event?: { type?: string; boardId?: string } }
    console.log('Monday webhook:', event?.type, event?.boardId)
    revalidateTag('monday-data', 'components')
  } catch (err) {
    console.error('Monday webhook error:', err)
  }
  return Response.json({ ok: true })
}

