import { revalidateTag } from 'next/cache'
import { auth } from '@/auth'

export async function POST() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidateTag('monday-data')
  return Response.json({ ok: true, timestamp: new Date().toISOString() })
}
