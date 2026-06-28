'use client'

import { useRouter } from 'next/navigation'
import type { Donor } from '@/lib/types'
import { ClassificationBadge } from './StatusBadge'

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function DonorCard({
  donor,
  onQuickView,
}: {
  donor: Donor
  onQuickView?: () => void
}) {
  const router = useRouter()
  const displayName = donor.hebrewName || donor.name

  return (
    <div
      onClick={() => router.push(`/donor/${donor.id}`)}
      className="group relative bg-white rounded-[--radius-card] shadow-lg hover:shadow-2xl hover:scale-[1.04] transition-all duration-200 active:scale-[0.97] overflow-hidden cursor-pointer"
    >
      {/* Gold-burgundy accent stripe */}
      <div className="h-2 bg-gradient-to-l from-primary via-accent to-primary" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-base">{displayName.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-text truncate text-base">{displayName}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {donor.city && <span className="text-xs text-muted">{donor.city}</span>}
              {donor.donorNumber && (
                <>
                  <span className="text-border text-[10px]">·</span>
                  <span className="text-xs text-muted font-mono">{donor.donorNumber}</span>
                </>
              )}
            </div>
          </div>
          <ClassificationBadge classification={donor.classification || 'רגיל'} />
        </div>

        {/* Hero */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 mb-3">
          <p className="text-[10px] text-muted uppercase tracking-widest mb-1">סה"כ תרומות</p>
          <p className="text-2xl font-bold text-primary leading-none">{fUSD(donor.totalDonations)}</p>
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-xs text-muted">
              התח׳: <span className="font-semibold text-text">{fUSD(donor.totalCommitments)}</span>
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              donor.balance > 0 ? 'bg-red-50 text-cancelled' : 'bg-green-50 text-paid'
            }`}>
              {donor.balance > 0 ? `יתרה ${fUSD(donor.balance)}` : '✓ מאוזן'}
            </span>
          </div>
        </div>

        {/* Year breakdown */}
        {[
          { year: '2025', c: donor.commitments2025, d: donor.donations2025, b: donor.balance2025 },
          { year: '2026', c: donor.commitments2026, d: donor.donations2026, b: donor.balance2026 },
        ].map(({ year, c, d, b }) => (
          <div key={year} className="border-t border-border/50 pt-2 mt-2">
            <p className="text-[10px] font-bold text-muted mb-1.5">{year}</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-[9px] text-muted/70 leading-none mb-0.5">התחייבויות</p>
                <p className="text-xs font-semibold text-text">{fUSD(c)}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted/70 leading-none mb-0.5">תרומות</p>
                <p className="text-xs font-semibold text-text">{fUSD(d)}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted/70 leading-none mb-0.5">יתרה</p>
                <p className={`text-xs font-bold ${b > 0 ? 'text-cancelled' : 'text-paid'}`}>{fUSD(b)}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Quick-view button — hidden until hover (always visible on mobile) */}
        {onQuickView && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickView() }}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-primary-hover transition-all
              opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-1 sm:group-hover:translate-y-0 duration-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            צפייה מהירה
          </button>
        )}
      </div>
    </div>
  )
}
