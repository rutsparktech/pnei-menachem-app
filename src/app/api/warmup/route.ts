import { getCachedMondayData } from '@/lib/monday'

export async function GET() {
  const start = Date.now()
  await getCachedMondayData()
  return Response.json({
    ok: true,
    ms: Date.now() - start,
    timestamp: new Date().toISOString()
  })
}
