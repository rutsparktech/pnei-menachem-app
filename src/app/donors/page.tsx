import Link from 'next/link'
import { Suspense } from 'react'
import { connection } from 'next/server'
import { getAllDonors } from '@/lib/api'
import KpiCard from '@/components/KpiCard'
import DonorCard from '@/components/DonorCard'
import SearchInput from '@/components/SearchInput'
import RefreshButton from '@/components/RefreshButton'

export const maxDuration = 300

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection()
  const { q } = await searchParams
  const donors = await getAllDonors()
  const lastUpdated = new Date().toISOString()

  const totalCommitments = donors.reduce((s, d) => s + d.totalCommitments, 0)
  const totalDonations = donors.reduce((s, d) => s + d.totalDonations, 0)
  const totalBalance = donors.reduce((s, d) => s + d.balance, 0)
  const activeDonors = donors.filter((d) => d.totalCommitments > 0).length

  const filtered = q
    ? donors.filter(
        (d) =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.hebrewName.includes(q) ||
          d.city.includes(q) ||
          d.donorNumber.includes(q)
      )
    : donors

  return (
    <>
      <RefreshButton lastUpdated={lastUpdated} />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard label='סה"כ התחייבויות' value={fUSD(totalCommitments)} accent />
        <KpiCard label='סה"כ תרומות' value={fUSD(totalDonations)} />
        <KpiCard label="יתרה לגבייה" value={fUSD(totalBalance)} sub={totalBalance > 0 ? 'לגבייה' : 'מאוזן'} />
        <KpiCard
          label="תורמים פעילים"
          value={activeDonors.toString()}
          sub={`מתוך ${donors.length} תורמים`}
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-text text-lg">תורמים</h2>
        <span className="text-sm text-muted">{filtered.length} רשומות</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-lg">לא נמצאו תורמים</p>
          {q && <p className="text-sm mt-1">נסה חיפוש אחר</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((donor) => (
            <DonorCard key={donor.id} donor={donor} />
          ))}
        </div>
      )}
    </>
  )
}

export default function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <div className="mb-3">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← חזרה לדשבורד
        </Link>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-primary mb-1">שלום</h1>
        <p className="text-sm text-muted">ניהול תורמים · קרן פני מנחם</p>
      </div>

      <div className="mb-5">
        <Suspense>
          <SearchInput placeholder="חיפוש לפי שם, עיר או מספר תורם..." />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-surface rounded-[--radius-card] animate-pulse border border-border" />
            ))}
          </div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
