import { connection } from 'next/server'
import { getCachedDonors, getCachedDonations, getCachedCommitments, getHomeSummary, getDonorList } from '@/lib/monday'

export async function GET() {
  await connection()
  const start = Date.now()
  await Promise.all([
    getCachedDonors(), getCachedDonations(), getCachedCommitments(),
    getHomeSummary(), getDonorList(),
  ])
  return Response.json({
    ok: true,
    ms: Date.now() - start,
    timestamp: new Date().toISOString()
  })
}
