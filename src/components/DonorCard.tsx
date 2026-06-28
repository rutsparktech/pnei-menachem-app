import Link from 'next/link'
import type { Donor } from '@/lib/types'
import { ClassificationBadge } from './StatusBadge'

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StatRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-t border-border/50 text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${valueClass ?? 'text-text'}`}>{value}</span>
    </div>
  )
}

export default function DonorCard({ donor }: { donor: Donor }) {
  const displayName = donor.hebrewName || donor.name

  return (
    <Link
      href={`/donor/${donor.id}`}
      className="block bg-white rounded-[--radius-card] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 active:scale-[0.98] overflow-hidden"
    >
      {/* Accent stripe */}
      <div className="h-1.5 bg-gradient-to-l from-primary via-accent to-primary" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{displayName.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-text truncate">{displayName}</p>
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

        {/* Hero — total donations */}
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
        <div className="space-y-0">
          {[
            { year: '2025', c: donor.commitments2025, d: donor.donations2025, b: donor.balance2025 },
            { year: '2026', c: donor.commitments2026, d: donor.donations2026, b: donor.balance2026 },
          ].map(({ year, c, d, b }) => (
            <div key={year} className="border-t border-border/40 pt-2 mt-2">
              <p className="text-[10px] font-bold text-muted mb-1">{year}</p>
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
        </div>
      </div>
    </Link>
  )
}
