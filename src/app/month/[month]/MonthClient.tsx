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

type DonorRow = {
  donorId: string
  donorName: string
  amount: number
  currency: string
  usdAmt: number
  isFuture: boolean
}
type Group = { designation: string; color: string; donors: DonorRow[]; total: number }

export default function MonthClient({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null)

  if (!groups.length) {
    return (
      <div className="text-center py-12 text-muted text-sm bg-surface rounded-xl border border-border">
        אין תרומות בחודש זה
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(({ designation, color, donors, total }) => {
        const isOpen = open === designation
        return (
          <div key={designation} className="bg-surface border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : designation)}
              className="w-full p-4 flex items-center justify-between text-start hover:bg-background/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="text-start">
                  <p className="font-semibold text-text">{designation}</p>
                  <p className="text-xs text-muted">{donors.length} תרומות</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-primary">{fUSD(total)}</p>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {donors.map((d, i) => (
                  <Link
                    key={i}
                    href={d.donorId ? `/donor/${d.donorId}` : '#'}
                    className="flex items-center justify-between px-4 py-3 hover:bg-background/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{d.donorName}</p>
                      {d.isFuture && (
                        <span className="text-[10px] bg-pending-bg text-pending px-1.5 py-0.5 rounded-full font-medium">
                          צפוי
                        </span>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-bold text-primary">{fMoney(d.amount, d.currency)}</p>
                      {d.currency !== '$' && (
                        <p className="text-[10px] text-muted">{fUSD(d.usdAmt)}</p>
                      )}
                    </div>
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
