'use client'

import { useState, useMemo } from 'react'
import type { Commitment, Donation } from '@/lib/types'
import { usd, money, formatDate, designationColor, orderDesignations } from '@/lib/format'

function StatusPill({ label }: { label: string }) {
  if (!label) return null
  const lower = label.toLowerCase()
  const cls =
    lower.includes('שולם') || lower.includes('פעיל') || lower.includes('הושלם')
      ? 'bg-paid-bg text-paid'
      : lower.includes('בוטל') || lower.includes('בטל')
      ? 'bg-cancelled-bg text-cancelled'
      : 'bg-pending-bg text-pending'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 bg-primary-light rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

function CommitmentCard({
  commitment,
  linked,
}: {
  commitment: Commitment
  linked: Donation[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        {/* Title */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-text text-sm leading-snug">{commitment.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: designationColor(commitment.designation) }}
              >
                {commitment.designation}
              </span>
              {commitment.date && (
                <span className="text-xs text-muted">{formatDate(commitment.date)}</span>
              )}
              {commitment.status && <StatusPill label={commitment.status} />}
            </div>
          </div>
          <div className="text-end flex-shrink-0">
            <p className="text-[10px] text-muted">סכום</p>
            <p className="font-bold text-text text-sm">{money(commitment.amount, commitment.currency)}</p>
            {commitment.currency !== '$' && commitment.usd > 0 && (
              <p className="text-[10px] text-muted">{usd(commitment.usd)}</p>
            )}
          </div>
        </div>

        {/* Progress: paid / remaining / % */}
        <div className="grid grid-cols-3 gap-2 text-center mb-2">
          <div>
            <p className="text-[10px] text-muted leading-none mb-1">שולם</p>
            <p className="text-sm font-bold text-paid">{usd(commitment.paidUsd)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted leading-none mb-1">נשאר</p>
            <p className={`text-sm font-bold ${commitment.remainingUsd > 0 ? 'text-cancelled' : 'text-paid'}`}>
              {usd(commitment.remainingUsd)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted leading-none mb-1">הושלם</p>
            <p className="text-sm font-bold text-primary">{commitment.pctPaid}%</p>
          </div>
        </div>
        <ProgressBar pct={commitment.pctPaid} />

        {linked.length > 0 && (
          <button
            onClick={() => setOpen(!open)}
            className="mt-3 flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            {open ? 'הסתר' : 'הצג'} תרומות ({linked.length})
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {open && linked.length > 0 && (
        <div className="border-t border-border bg-background overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['תאריך', 'סכום', 'סטטוס', 'שיטה'].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs text-muted font-medium text-start whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linked.map((d) => (
                <tr key={d.id} className="hover:bg-surface/60">
                  <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-primary whitespace-nowrap">
                    {money(d.amount, d.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill label={d.paymentStatus} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{d.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type Props = {
  commitments: Commitment[]
  donations: Donation[]
}

export default function FinancialCard({ commitments, donations }: Props) {
  const [filterDesignation, setFilterDesignation] = useState('הכל')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const donationsByCommitment = useMemo(() => {
    const m = new Map<string, Donation[]>()
    for (const d of donations) {
      if (!d.commitmentId) continue
      if (!m.has(d.commitmentId)) m.set(d.commitmentId, [])
      m.get(d.commitmentId)!.push(d)
    }
    return m
  }, [donations])

  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      if (filterDesignation !== 'הכל' && d.designation !== filterDesignation) return false
      if (filterFrom && d.date < filterFrom) return false
      if (filterTo && d.date > filterTo) return false
      return true
    })
  }, [donations, filterDesignation, filterFrom, filterTo])

  const byDesignation = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>()
    for (const d of filteredDonations) {
      const key = d.designation || 'שונות'
      const cur = m.get(key) ?? { count: 0, total: 0 }
      cur.count++
      cur.total += d.usd
      m.set(key, cur)
    }
    const keys = orderDesignations([...m.keys()])
    return keys.map((k) => [k, m.get(k)!] as const)
  }, [filteredDonations])

  const usedDesignations = useMemo(
    () => orderDesignations([...new Set(donations.map((d) => d.designation).filter(Boolean))]),
    [donations]
  )

  const totalCommitted = commitments.reduce((s, c) => s + c.usd, 0)
  const totalPaid = commitments.reduce((s, c) => s + c.paidUsd, 0)
  const totalRemaining = commitments.reduce((s, c) => s + c.remainingUsd, 0)
  const pctOverall = totalCommitted > 0 ? Math.round((totalPaid / totalCommitted) * 100) : 0
  const isFiltered = filterDesignation !== 'הכל' || !!filterFrom || !!filterTo

  return (
    <>
      {/* ── Commitments ───────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="font-bold text-text text-lg mb-3">
          התחייבויות
          <span className="text-sm font-normal text-muted me-2">({commitments.length})</span>
        </h2>

        {commitments.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm bg-surface rounded-xl border border-border">
            אין התחייבויות
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {commitments.map((c) => (
                <CommitmentCard
                  key={c.id}
                  commitment={c}
                  linked={donationsByCommitment.get(c.id) ?? []}
                />
              ))}
            </div>

            {/* Summary row */}
            <div className="mt-3 bg-background border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted mb-3">סיכום התחייבויות</p>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <p className="text-[10px] text-muted">סה&quot;כ</p>
                  <p className="font-bold text-text">{usd(totalCommitted)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">שולם</p>
                  <p className="font-bold text-paid">{usd(totalPaid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">נשאר</p>
                  <p className={`font-bold ${totalRemaining > 0 ? 'text-cancelled' : 'text-paid'}`}>
                    {usd(totalRemaining)}
                  </p>
                </div>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">התקדמות כוללת</span>
                <span className="font-bold text-primary">{pctOverall}%</span>
              </div>
              <div className="h-2.5 bg-primary-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pctOverall}%` }}
                />
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Donations ─────────────────────────────────────────────── */}
      <section>
        <h2 className="font-bold text-text text-lg mb-3">
          תרומות
          <span className="text-sm font-normal text-muted me-2">({filteredDonations.length})</span>
        </h2>

        {/* Filter bar */}
        <div className="bg-surface border border-border rounded-xl p-3 mb-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted block mb-1">ייעוד</label>
              <select
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background text-text"
              >
                <option value="הכל">הכל</option>
                {usedDesignations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted block mb-1">מתאריך</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background text-text"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted block mb-1">עד תאריך</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background text-text"
              />
            </div>
          </div>
          {isFiltered && (
            <button
              onClick={() => { setFilterDesignation('הכל'); setFilterFrom(''); setFilterTo('') }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              נקה סינון
            </button>
          )}
        </div>

        {/* By designation */}
        {byDesignation.length > 0 ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-background border-b border-border">
              <p className="text-xs font-semibold text-muted">לפי ייעוד</p>
            </div>
            <div className="divide-y divide-border">
              {byDesignation.map(([designation, { count, total }]) => (
                <div key={designation} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: designationColor(designation) }}
                    />
                    <div>
                      <p className="text-sm font-medium text-text">{designation}</p>
                      <p className="text-xs text-muted">{count} תרומות</p>
                    </div>
                  </div>
                  <p className="font-bold text-primary">{usd(total)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted text-sm bg-surface rounded-xl border border-border">
            {isFiltered ? 'אין תרומות לפי הסינון הנבחר' : 'אין תרומות'}
          </div>
        )}
      </section>
    </>
  )
}
