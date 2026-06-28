import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function POST() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath('/', 'layout')
  return Response.json({ ok: true, timestamp: new Date().toISOString() })
}
