'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { Donor } from '@/lib/types'

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function DonorDrawer({
  donor,
  onClose,
}: {
  donor: Donor | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!donor) return
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
    }
  }, [donor, onClose])

  if (!donor) return null

  const displayName = donor.hebrewName || donor.name

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm backdrop-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col drawer-slide-in">

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 text-white flex-shrink-0"
          style={{
            background:
              'radial-gradient(ellipse 160% 100% at 50% -20%, rgba(212,175,55,0.35) 0%, transparent 60%), ' +
              'linear-gradient(160deg, #6c2d45 0%, #4d1e32 100%)',
          }}
        >
          <div>
            <p className="font-bold text-xl leading-tight">{displayName}</p>
            {donor.city && <p className="text-white/70 text-sm mt-0.5">{donor.city}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="סגור"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {donor.classification && (
              <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                {donor.classification}
              </span>
            )}
            {donor.donorNumber && (
              <span className="text-xs text-muted font-mono bg-background px-3 py-1 rounded-full border border-border">
                #{donor.donorNumber}
              </span>
            )}
            {donor.currency && (
              <span className="text-xs text-muted bg-background px-3 py-1 rounded-full border border-border">
                {donor.currency}
              </span>
            )}
          </div>

          <div className="bg-primary rounded-2xl p-5">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-1">סה"כ תרומות</p>
            <p className="text-4xl font-bold text-white">{fUSD(donor.totalDonations)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background rounded-xl p-4 border border-border">
              <p className="text-muted text-xs mb-1">סה"כ התחייבויות</p>
              <p className="text-xl font-bold text-text">{fUSD(donor.totalCommitments)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${
              donor.balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}>
              <p className="text-muted text-xs mb-1">יתרה לגבייה</p>
              <p className={`text-xl font-bold ${donor.balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
                {donor.balance > 0 ? fUSD(donor.balance) : '✓ מאוזן'}
              </p>
            </div>
          </div>

          {[
            { year: '2025', c: donor.commitments2025, d: donor.donations2025, b: donor.balance2025 },
            { year: '2026', c: donor.commitments2026, d: donor.donations2026, b: donor.balance2026 },
          ].map(({ year, c, d, b }) => (
            <div key={year} className="border border-border rounded-xl overflow-hidden">
              <div className="bg-background px-4 py-2 border-b border-border">
                <p className="font-bold text-primary text-sm">{year}</p>
              </div>
              <div className="grid grid-cols-3 text-center">
                {[
                  { label: 'התחייבויות', value: fUSD(c), cls: 'text-text' },
                  { label: 'תרומות', value: fUSD(d), cls: 'text-text' },
                  { label: 'יתרה', value: fUSD(b), cls: b > 0 ? 'text-cancelled' : 'text-paid' },
                ].map(({ label, value, cls }, i) => (
                  <div key={label} className={`px-3 py-3 ${i > 0 ? 'border-r border-border' : ''}`}>
                    <p className="text-[10px] text-muted mb-1">{label}</p>
                    <p className={`text-sm font-bold ${cls}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-background flex-shrink-0">
          <Link
            href={`/donor/${donor.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors"
          >
            כרטיס מלא
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  )
}
