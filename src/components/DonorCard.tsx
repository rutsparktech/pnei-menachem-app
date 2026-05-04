import Link from 'next/link'
import type { Donor } from '@/lib/types'
import { ClassificationBadge } from './StatusBadge'

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function YearRow({
  year,
  commitments,
  donations,
  balance,
}: {
  year: string
  commitments: number
  donations: number
  balance: number
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-t border-border/60">
      <span className="font-bold text-muted w-10 flex-shrink-0">{year}</span>
      <div className="flex items-center gap-3 flex-1 justify-end">
        <div className="text-center min-w-[68px]">
          <p className="text-muted/70 text-[10px] leading-none mb-0.5">התחייבויות</p>
          <p className="font-medium text-text">{fUSD(commitments)}</p>
        </div>
        <div className="text-center min-w-[68px]">
          <p className="text-muted/70 text-[10px] leading-none mb-0.5">תרומות</p>
          <p className="font-medium text-text">{fUSD(donations)}</p>
        </div>
        <div className="text-center min-w-[60px]">
          <p className="text-muted/70 text-[10px] leading-none mb-0.5">יתרה</p>
          <p className={`font-bold ${balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
            {fUSD(balance)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DonorCard({ donor }: { donor: Donor }) {
  const displayName = donor.hebrewName || donor.name

  return (
    <Link
      href={`/donor/${donor.id}`}
      className="block bg-surface rounded-[--radius-card] border border-border shadow-sm p-4 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{displayName.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-text truncate">{displayName}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {donor.city && <p className="text-xs text-muted">{donor.city}</p>}
              {donor.donorNumber && (
                <>
                  <span className="text-border text-xs">·</span>
                  <p className="text-xs text-muted font-mono">{donor.donorNumber}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <ClassificationBadge classification={donor.classification || 'רגיל'} />
          {donor.currency && (
            <span className="text-[10px] text-muted bg-background px-1.5 py-0.5 rounded font-mono">
              {donor.currency}
            </span>
          )}
        </div>
      </div>

      {/* Hero: total donations */}
      <div className="bg-background rounded-xl px-3 py-2.5 mb-2">
        <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">סה"כ תרומות</p>
        <p className="text-xl font-bold text-primary">{fUSD(donor.totalDonations)}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted">
            התחייבויות:{' '}
            <span className="font-semibold text-text">{fUSD(donor.totalCommitments)}</span>
          </span>
          <span className={`text-xs font-bold ${donor.balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
            יתרה: {fUSD(donor.balance)}
          </span>
        </div>
      </div>

      {/* Year rows */}
      <YearRow
        year="2025"
        commitments={donor.commitments2025}
        donations={donor.donations2025}
        balance={donor.balance2025}
      />
      <YearRow
        year="2026"
        commitments={donor.commitments2026}
        donations={donor.donations2026}
        balance={donor.balance2026}
      />
    </Link>
  )
}
