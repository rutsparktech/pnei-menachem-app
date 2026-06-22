import { connection } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCachedDonors, getCachedDonations, getCachedCommitments, getHomeSummary, getDonorList } from '@/lib/monday'

export async function GET(req: NextRequest) {
  // Protect against unauthorized callers.
  // Vercel Cron automatically adds Authorization: Bearer <CRON_SECRET>.
  // When CRON_SECRET is set, any other caller is rejected.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('[warmup] CRON_SECRET not set — endpoint is unprotected')
  }

  await connection()
  const start = Date.now()
  await Promise.all([
    getCachedDonors(), getCachedDonations(), getCachedCommitments(),
    getHomeSummary(), getDonorList(),
  ])
  return Response.json({ ok: true, ms: Date.now() - start, timestamp: new Date().toISOString() })
}
