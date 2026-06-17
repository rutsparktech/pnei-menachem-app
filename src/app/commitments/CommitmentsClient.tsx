'use client'

import { useState } from 'react'
import Link from 'next/link'

function fUSD(n: number) {
  return '$' + Math.round(n || 0).toLocaleString('en-US')
}
function fMoney(n: number, currency: string) {
  const v = Math.round(n || 0).toLocaleString('he-IL')
  const c = (currency || '').trim()
  if (c === '₪') return `₪${v}`
  if (c === '€') return `€${v}`
  return `$${v}`
}
function fDate(d: string) {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  } catch { return d }
}

type CommitmentRow = {
  id: string; name: string; donorId: string; donorName: string
  amount: number; currency: string; usdAmt: number
  paidUsd: number; remainingUsd: number; pctPaid: number
  status: string; date: string
}
type Group = {
  designation: string; color: string
  totalUsd: number; paidUsd: number; remainingUsd: number; pctPaid: number
  items: CommitmentRow[]
}

function StatusPill({ label }: { label: string }) {
  if (!label) return null
  const lower = label.toLowerCase()
  const cls =
    lower.includes('שולם') || lower.includes('פעיל') || lower.includes('הושלם')
      ? 'bg-paid-bg text-paid'
      : lower.includes('בוטל')
      ? 'bg-cancelled-bg text-cancelled'
      : 'bg-pending-bg text-pending'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

function Bar({ pct, thin }: { pct: number; thin?: boolean }) {
  return (
    <div className={`${thin ? 'h-1.5' : 'h-2'} bg-primary-light rounded-full overflow-hidden`}>
      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default function CommitmentsClient({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null)

  if (!groups.length) {
    return <div className="text-center py-12 text-muted text-sm bg-surface rounded-xl border border-border">אין התחייבויות</div>
  }

  return (
    <div className="space-y-3">
      {groups.map(({ designation, color, totalUsd, paidUsd, remainingUsd, pctPaid, items }) => {
        const isOpen = open === designation
        return (
          <div key={designation} className="bg-surface border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : designation)}
              className="w-full p-4 text-start hover:bg-background/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <p className="font-semibold text-text">{designation}</p>
                  <span className="text-xs text-muted">({items.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-text">{fUSD(totalUsd)}</p>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <div>
                  <p className="text-[10px] text-muted">שולם</p>
                  <p className="text-xs font-bold text-paid">{fUSD(paidUsd)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">נשאר</p>
                  <p className={`text-xs font-bold ${remainingUsd > 0 ? 'text-cancelled' : 'text-paid'}`}>{fUSD(remainingUsd)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">הושלם</p>
                  <p className="text-xs font-bold text-primary">{pctPaid}%</p>
                </div>
              </div>
              <Bar pct={pctPaid} />
            </button>

            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {items.map((c) => (
                  <Link key={c.id} href={c.donorId ? `/donor/${c.donorId}` : '#'}
                    className="block px-4 py-3 hover:bg-background/60 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{c.donorName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {c.date && <span className="text-xs text-muted">{fDate(c.date)}</span>}
                          {c.status && <StatusPill label={c.status} />}
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <p className="text-sm font-bold text-text">{fMoney(c.amount, c.currency)}</p>
                        {c.currency !== '$' && <p className="text-[10px] text-muted">{fUSD(c.usdAmt)}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-1.5">
                      <div>
                        <p className="text-[10px] text-muted">שולם</p>
                        <p className="text-xs font-bold text-paid">{fUSD(c.paidUsd)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted">נשאר</p>
                        <p className={`text-xs font-bold ${c.remainingUsd > 0 ? 'text-cancelled' : 'text-paid'}`}>{fUSD(c.remainingUsd)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted">%</p>
                        <p className="text-xs font-bold text-primary">{c.pctPaid}%</p>
                      </div>
                    </div>
                    <Bar pct={c.pctPaid} thin />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
