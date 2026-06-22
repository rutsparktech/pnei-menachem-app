import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Monday challenge handshake (happens before HMAC is set up)
    let body: Record<string, unknown>
    try { body = JSON.parse(rawBody) } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
    if (body.challenge) return Response.json({ challenge: body.challenge })

    // HMAC signature validation — enforced when MONDAY_WEBHOOK_SECRET is configured
    const secret = process.env.MONDAY_WEBHOOK_SECRET
    if (secret) {
      const signature = req.headers.get('x-monday-signature') ?? ''
      const sigHex = signature.startsWith('sha256=') ? signature.slice(7) : signature
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      let valid = false
      try {
        valid = sigHex.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(sigHex, 'hex'), Buffer.from(expected, 'hex'))
      } catch { valid = false }
      if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 401 })
    } else {
      console.warn('[webhook] MONDAY_WEBHOOK_SECRET not set — skipping HMAC validation')
    }

    const { event } = body as { event?: { type?: string; boardId?: string } }
    console.log('Monday webhook:', event?.type, event?.boardId)
    revalidateTag('monday-data')
  } catch (err) {
    console.error('Monday webhook error:', err)
  }
  return Response.json({ ok: true })
}
