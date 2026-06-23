import { connection } from 'next/server'
import type { NextRequest } from 'next/server'
export const maxDuration = 300

import { getHomeSummary, getDonorList } from '@/lib/monday'

export async function GET(req: NextRequest) {
  // Vercel Cron automatically adds Authorization: Bearer <CRON_SECRET>.
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
  // Sequential: React cache() in computeBundle() deduplicates the Monday fetch
  // so both selectors share a single board-fetch round-trip per warmup run.
  await getHomeSummary()
  await getDonorList()
  return Response.json({ ok: true, ms: Date.now() - start, timestamp: new Date().toISOString() })
}
