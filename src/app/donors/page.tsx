import { Suspense } from 'react'
import { getAllDonors } from '@/lib/api'
import KpiCard from '@/components/KpiCard'
import SearchInput from '@/components/SearchInput'
import RefreshButton from '@/components/RefreshButton'
import DonorListClient from './DonorListClient'

export const maxDuration = 300
export const revalidate = 7200

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const donors = await getAllDonors()
  const lastUpdated = new Date().toISOString()

  const totalCommitments = donors.reduce((s, d) => s + d.totalCommitments, 0)
  const totalDonations = donors.reduce((s, d) => s + d.totalDonations, 0)
  const totalBalance = donors.reduce((s, d) => s + d.balance, 0)
  const activeDonors = donors.filter((d) => d.totalCommitments > 0).length

  const filtered = q
    ? donors.filter((d) =>
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.hebrewName.includes(q) ||
        d.city.includes(q) ||
        d.donorNumber.includes(q)
      )
    : donors

  return (
    <>
      <RefreshButton lastUpdated={lastUpdated} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label='סה"כ התחייבויות' value={fUSD(totalCommitments)} accent />
        <KpiCard label='סה"כ תרומות' value={fUSD(totalDonations)} />
        <KpiCard label="יתרה לגבייה" value={fUSD(totalBalance)} sub={totalBalance > 0 ? 'לגבייה' : 'מאוזן'} />
        <KpiCard label="תורמים פעילים" value={activeDonors.toString()} sub={`מתוך ${donors.length} תורמים`} />
      </div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-white text-lg">תורמים</h2>
        <span className="text-sm text-white/50">{filtered.length} רשומות</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <p className="text-lg">לא נמצאו תורמים</p>
          {q && <p className="text-sm mt-1">נסה חיפוש אחר</p>}
        </div>
      ) : (
        <DonorListClient donors={filtered} />
      )}
    </>
  )
}

export default function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="px-4 py-4 md:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white mb-1">שלום</h1>
        <p className="text-sm text-white/60">ניהול תורמים · קרן פני מנחם</p>
      </div>
      <div className="mb-5">
        <Suspense><SearchInput placeholder="חיפוש לפי שם, עיר או מספר תורם..." /></Suspense>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 bg-white/10 rounded-[--radius-card] animate-pulse" />
            ))}
          </div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
