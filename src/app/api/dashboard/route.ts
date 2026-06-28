import { auth } from '@/auth'
import { fetchAllDonorsWithDetails } from '@/lib/monday'
import { NextResponse, connection } from 'next/server'

export async function GET() {
  await connection()
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const donors = await fetchAllDonorsWithDetails()

    const totalDonations = donors.reduce((s, d) => s + d.totalDonations, 0)
    const totalCommitments = donors.reduce((s, d) => s + d.totalCommitments, 0)
    const balance = donors.reduce((s, d) => s + d.balance, 0)
    const donations2025 = donors.reduce((s, d) => s + d.donations2025, 0)
    const donations2026 = donors.reduce((s, d) => s + d.donations2026, 0)
    const commitments2025 = donors.reduce((s, d) => s + d.commitments2025, 0)
    const commitments2026 = donors.reduce((s, d) => s + d.commitments2026, 0)
    const activeDonors = donors.filter((d) => d.totalDonations > 0).length

    const byMonth2026 = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      return donors
        .flatMap((d) => d.donations)
        .filter((d) => {
          if (!d.donationDate) return false
          const dt = new Date(d.donationDate)
          return dt.getFullYear() === 2026 && dt.getMonth() + 1 === month
        })
        .reduce((s, d) => s + d.amount, 0)
    })

    const topDonors = donors
      .sort((a, b) => b.totalDonations - a.totalDonations)
      .slice(0, 10)
      .map((d) => ({
        id: d.id,
        name: d.hebrewName || d.name,
        totalDonations: d.totalDonations,
        donations2026: d.donations2026,
      }))

    return NextResponse.json({
      totalDonations,
      totalCommitments,
      balance,
      donations2025,
      donations2026,
      commitments2025,
      commitments2026,
      activeDonors,
      byMonth2026,
      topDonors,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
