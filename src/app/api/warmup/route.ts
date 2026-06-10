import { connection } from 'next/server'
import { getCachedDonors, getCachedDonations, getCachedCommitments } from '@/lib/monday'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  await connection()
  const start = Date.now()
  await Promise.all([getCachedDonors(), getCachedDonations(), getCachedCommitments()])
  return Response.json({ ok: true, ms: Date.now() - start, timestamp: new Date().toISOString() })
}
