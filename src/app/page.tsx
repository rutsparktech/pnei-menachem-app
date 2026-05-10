import { fetchAllDonorsWithDetails } from '@/lib/monday'
import DashboardClient from './components/DashboardClient'

export default async function DashboardPage() {
  let donors: Awaited<ReturnType<typeof fetchAllDonorsWithDetails>>

  try {
    donors = await fetchAllDonorsWithDetails()
  } catch {
    return (
      <div dir="rtl" style={{ padding: 32, color: '#6c2d45', fontFamily: 'sans-serif' }}>
        שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.
      </div>
    )
  }

  const totalDonations = donors.reduce((s, d) => s + d.totalDonations, 0)
  const totalCommitments = donors.reduce((s, d) => s + d.totalCommitments, 0)
  const balance = donors.reduce((s, d) => s + d.balance, 0)
  const activeDonors = donors.filter((d) => d.totalDonations > 0).length
  const donations2025 = donors.reduce((s, d) => s + d.donations2025, 0)
  const donations2026 = donors.reduce((s, d) => s + d.donations2026, 0)
  const commitments2025 = donors.reduce((s, d) => s + d.commitments2025, 0)
  const commitments2026 = donors.reduce((s, d) => s + d.commitments2026, 0)

  const byMonth2026 = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    return donors
      .flatMap((d) => d.donations)
      .filter((don) => {
        if (!don.donationDate) return false
        const dt = new Date(don.donationDate)
        return dt.getFullYear() === 2026 && dt.getMonth() + 1 === month
      })
      .reduce((s, don) => s + don.amount, 0)
  })

  const topDonors = [...donors]
    .sort((a, b) => b.totalDonations - a.totalDonations)
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      name: d.hebrewName || d.name,
      totalDonations: d.totalDonations,
      donations2026: d.donations2026,
    }))

  return (
    <DashboardClient
      totalDonations={totalDonations}
      totalCommitments={totalCommitments}
      balance={balance}
      activeDonors={activeDonors}
      donations2025={donations2025}
      donations2026={donations2026}
      commitments2025={commitments2025}
      commitments2026={commitments2026}
      byMonth2026={byMonth2026}
      topDonors={topDonors}
    />
  )
}
