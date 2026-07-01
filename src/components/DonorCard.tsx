'use client'

import { useRouter } from 'next/navigation'
import type { Donor } from '@/lib/types'

function fmt(n: number) {
  return Math.abs(n).toLocaleString('en-US')
}

function CircularGauge({
  donations,
  commitments,
  balance,
}: {
  donations: number
  commitments: number
  balance: number
}) {
  const pct = commitments > 0 ? Math.min(donations / commitments, 1) : 0
  const r = 34
  const cx = 42
  const cy = 42
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const pctDisplay = Math.round(pct * 100)
  const color = pct >= 1 ? '#16a34a' : pct >= 0.5 ? '#6c2d45' : '#d97706'

  return (
    <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 mb-3">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <svg width={84} height={84} viewBox="0 0 84 84">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(108,45,69,0.12)" strokeWidth={7} />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeDasharray={`${circ}`}
              strokeDashoffset={`${offset}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize={15} fontWeight="bold" fill={color}>
              {pctDisplay}%
            </text>
            <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill="#9ca3af">
              גבייה
            </text>
          </svg>
        </div>

        <div className="flex-1 space-y-2">
          {[
            { label: 'התחייבויות', amount: commitments, cls: 'text-text' },
            { label: 'תרומות', amount: donations, cls: 'text-primary' },
            { label: 'יתרת השלמה', amount: balance, cls: balance > 0 ? 'text-cancelled' : 'text-paid' },
          ].map(({ label, amount, cls }) => (
            <div key={label}>
              <p className="text-[10px] text-muted leading-none mb-0.5">{label}</p>
              <p className={`text-sm font-bold ${cls} flex items-baseline gap-0.5`}>
                <span className="text-[10px] font-normal text-muted">$</span>
                {fmt(amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
        {/* Header — name only */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-lg">{displayName.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-text truncate text-lg leading-tight">{displayName}</p>
          </div>
        </div>

        {/* Circular gauge with totals */}
        <CircularGauge
          donations={donor.totalDonations}
          commitments={donor.totalCommitments}
          balance={donor.balance}
        />

        {/* Quick-view button — hidden until hover (always visible on mobile) */}
        {onQuickView && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickView()
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-primary-hover transition-all
              opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-1 sm:group-hover:translate-y-0 duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-3.5 h-3.5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            צפייה מהירה
          </button>
        )}
      </div>
    </div>
  )
}
