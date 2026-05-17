import { getCachedDonors, getCachedDonations, getCachedCommitments } from '@/lib/monday'

export async function GET() {
  const start = Date.now()
  await Promise.all([getCachedDonors(), getCachedDonations(), getCachedCommitments()])
  return Response.json({
    ok: true,
    ms: Date.now() - start,
    timestamp: new Date().toISOString()
  })
}
