'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Donor, DonorWithDetails, Commitment, Donation } from '@/lib/types'

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ProgressBar({ pct }: { pct: number }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p}%` }} />
    </div>
  )
}

function CommitmentRow({ c, donations }: { c: Commitment; donations: Donation[] }) {
  const [open, setOpen] = useState(false)
  const linked = donations.filter((d) => d.commitmentId === c.id)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-text leading-snug">{c.name}</p>
            <p className="text-[11px] text-muted mt-0.5">{c.designation}{c.date ? ` · ${fDate(c.date)}` : ''}</p>
          </div>
          <p className="font-bold text-primary text-sm flex-shrink-0">{fUSD(c.usd)}</p>
        </div>
        <ProgressBar pct={c.pctPaid} />
        <div className="grid grid-cols-3 text-center mt-2 gap-1">
          <div>
            <p className="text-[9px] text-muted mb-0.5">שולם</p>
            <p className="text-xs font-bold text-paid">{fUSD(c.paidUsd)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted mb-0.5">נשאר</p>
            <p className={`text-xs font-bold ${c.remainingUsd > 0 ? 'text-cancelled' : 'text-paid'}`}>{fUSD(c.remainingUsd)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted mb-0.5">%</p>
            <p className="text-xs font-bold text-text">{Math.round(c.pctPaid)}%</p>
          </div>
        </div>
        {linked.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            className="mt-2 w-full text-[11px] text-primary font-semibold flex items-center justify-center gap-1 hover:underline"
          >
            {open ? '▲' : '▼'} {linked.length} תרומות מקושרות
          </button>
        )}
      </div>
      {open && linked.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {linked.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-2 text-xs">
              <span className="text-muted">{fDate(d.date)}</span>
              <span className="font-semibold text-text">{fUSD(d.usd)}</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                d.paymentStatus === 'paid' || d.paymentStatus === 'שולם'
                  ? 'bg-paid-bg text-paid'
                  : 'bg-pending-bg text-pending'
              }`}>{d.paymentStatus || 'ממתין'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DonorDrawer({
  donor,
  onClose,
}: {
  donor: Donor | null
  onClose: () => void
}) {
  const [details, setDetails] = useState<DonorWithDetails | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!donor) { setDetails(null); return }
    setLoading(true)
    setDetails(null)
    fetch(`/api/donors/${donor.id}`)
      .then((r) => r.json())
      .then((data) => { setDetails(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [donor?.id])

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm backdrop-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col drawer-slide-in">

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 text-white flex-shrink-0"
          style={{
            background:
              'radial-gradient(ellipse 160% 100% at 50% -20%, rgba(212,175,55,0.35) 0%, transparent 60%), ' +
              'linear-gradient(160deg, #6c2d45 0%, #4d1e32 100%)',
          }}
        >
          <div className="min-w-0">
            <p className="font-bold text-xl leading-tight truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {donor.city && <span className="text-white/70 text-sm">{donor.city}</span>}
              {donor.classification && (
                <span className="text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full">
                  {donor.classification}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors mr-2"
            aria-label="סגור"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Totals summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 bg-primary rounded-xl p-4 text-white">
              <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">סה"כ תרומות</p>
              <p className="text-3xl font-bold">{fUSD(donor.totalDonations)}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted mb-1">התחייבויות</p>
              <p className="font-bold text-sm text-text">{fUSD(donor.totalCommitments)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${donor.balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-[10px] text-muted mb-1">יתרה</p>
              <p className={`font-bold text-sm ${donor.balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
                {donor.balance > 0 ? fUSD(donor.balance) : '✓ מאוזן'}
              </p>
            </div>
            {donor.donorNumber && (
              <div className="bg-background border border-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted mb-1">מספר תורם</p>
                <p className="font-bold text-sm text-text font-mono">#{donor.donorNumber}</p>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-border/30 rounded-xl" />
              ))}
            </div>
          )}

          {/* Full commitments */}
          {details && details.commitments.length > 0 && (
            <div>
              <p className="font-bold text-primary text-sm mb-3 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                התחייבויות ({details.commitments.length})
              </p>
              <div className="space-y-3">
                {details.commitments.map((c) => (
                  <CommitmentRow key={c.id} c={c} donations={details.donations} />
                ))}
              </div>
            </div>
          )}

          {/* Recent donations (not linked to commitments) */}
          {details && details.donations.filter(d => !d.commitmentId).length > 0 && (
            <div>
              <p className="font-bold text-primary text-sm mb-3 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                תרומות נוספות
              </p>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {details.donations.filter(d => !d.commitmentId).slice(0, 10).map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-text">{fUSD(d.usd)}</p>
                      <p className="text-[11px] text-muted">{d.designation} · {fDate(d.date)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.paymentStatus === 'paid' || d.paymentStatus === 'שולם'
                        ? 'bg-paid-bg text-paid'
                        : 'bg-pending-bg text-pending'
                    }`}>{d.paymentStatus || 'ממתין'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex-shrink-0">
          <Link
            href={`/donor/${donor.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors"
          >
            לכרטיס המלא
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  )
}
