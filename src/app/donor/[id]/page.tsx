import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDonorHeader, getDonorDetail } from '@/lib/monday'
import { ClassificationBadge } from '@/components/StatusBadge'
import FinancialCard from '@/components/FinancialCard'
import { usd, formatDate } from '@/lib/format'

export const maxDuration = 300
export const revalidate = 3600

// ─── Skeletons ────────────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-28 bg-surface rounded mb-4" />
      <div className="bg-surface rounded-[--radius-card] h-32 mb-4" />
    </div>
  )
}

function FinancialsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface rounded-[--radius-card] h-16" />
        ))}
      </div>
      <div className="bg-surface rounded-xl h-10" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-surface rounded-xl h-28" />
      ))}
    </div>
  )
}

// ─── Header — loads fast (donors cache only) ──────────────────────────────────

async function DonorHeader({ id }: { id: string }) {
  const donor = await getDonorHeader(id)
  if (!donor) notFound()

  const displayName = donor.hebrewName || donor.name

  return (
    <>
      <Link
        href="/donors"
        className="inline-flex items-center gap-1.5 text-sm text-muted mb-4 hover:text-primary transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 rotate-180">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        חזרה לרשימה
      </Link>

      <div className="bg-primary rounded-[--radius-card] p-5 mb-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">{displayName.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{displayName}</h1>
              {donor.phone && (
                <a
                  href={`tel:${donor.phone}`}
                  className="inline-flex items-center gap-1.5 text-accent text-sm mt-1 hover:underline"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {donor.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <ClassificationBadge classification={donor.classification || 'רגיל'} />
            {donor.currency && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                {donor.currency}
              </span>
            )}
          </div>
        </div>
        {donor.lastUpdated && (
          <p className="text-white/50 text-xs mt-3">עודכן לאחרונה: {formatDate(donor.lastUpdated)}</p>
        )}
      </div>
    </>
  )
}

// ─── Financials — KPIs + FinancialCard ───────────────────────────────────────

async function DonorFinancials({ id }: { id: string }) {
  const donor = await getDonorDetail(id)
  if (!donor) return null

  const sortedCommitments = [...donor.commitments].sort((a, b) =>
    (a.date || '') < (b.date || '') ? 1 : -1
  )
  const sortedDonations = [...donor.donations].sort((a, b) =>
    (a.date || '') < (b.date || '') ? 1 : -1
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface rounded-[--radius-card] border border-border p-3 text-center">
          <p className="text-[10px] text-muted mb-1">התחייבויות</p>
          <p className="font-bold text-text text-sm">{usd(donor.totalCommitments)}</p>
        </div>
        <div className="bg-surface rounded-[--radius-card] border border-border p-3 text-center">
          <p className="text-[10px] text-muted mb-1">תרומות</p>
          <p className="font-bold text-primary text-sm">{usd(donor.totalDonations)}</p>
        </div>
        <div className="bg-surface rounded-[--radius-card] border border-border p-3 text-center">
          <p className="text-[10px] text-muted mb-0.5">יתרה</p>
          <p className={`font-bold text-sm ${donor.balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
            {usd(donor.balance)}
          </p>
          <p className="text-[10px] text-muted">{donor.pctPaid}% הושלם</p>
        </div>
      </div>

      <FinancialCard
        commitments={sortedCommitments}
        donations={sortedDonations}
      />
    </>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DonorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      <Suspense fallback={<HeaderSkeleton />}>
        <DonorHeader id={id} />
      </Suspense>

      <Suspense fallback={<FinancialsSkeleton />}>
        <DonorFinancials id={id} />
      </Suspense>
    </div>
  )
}
