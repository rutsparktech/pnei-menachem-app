import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body.challenge) {
    return Response.json({ challenge: body.challenge })
  }
  const { event } = body
  console.log('Monday webhook:', event?.type, event?.boardId)
  revalidateTag('monday-data')
  return Response.json({ ok: true })
}
