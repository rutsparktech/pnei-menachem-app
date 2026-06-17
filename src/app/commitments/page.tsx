import { Suspense } from 'react'
import { connection } from 'next/server'
import Link from 'next/link'
import { getDataBundle } from '@/lib/monday'
import { usd, orderDesignations, designationColor } from '@/lib/format'
import CommitmentsClient from './CommitmentsClient'

async function CommitmentsContent() {
  await connection()
  const { commitments } = await getDataBundle()

  type CommitmentRow = {
    id: string; name: string; donorId: string; donorName: string
    amount: number; currency: string; usdAmt: number
    paidUsd: number; remainingUsd: number; pctPaid: number
    status: string; date: string
  }

  const map = new Map<string, CommitmentRow[]>()
  for (const c of commitments) {
    const key = c.designation || 'שונות'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({
      id: c.id, name: c.name, donorId: c.donorId || '', donorName: c.donorName,
      amount: c.amount, currency: c.currency, usdAmt: c.usd,
      paidUsd: c.paidUsd, remainingUsd: c.remainingUsd, pctPaid: c.pctPaid,
      status: c.status, date: c.date,
    })
  }

  const groups = orderDesignations([...map.keys()]).map((designation) => {
    const items = map.get(designation)!.sort((a, b) => b.usdAmt - a.usdAmt)
    const totalUsd     = items.reduce((s, c) => s + c.usdAmt, 0)
    const paidUsd      = items.reduce((s, c) => s + c.paidUsd, 0)
    const remainingUsd = items.reduce((s, c) => s + c.remainingUsd, 0)
    const pctPaid = totalUsd > 0 ? Math.round((paidUsd / totalUsd) * 100) : 0
    return { designation, color: designationColor(designation), items, totalUsd, paidUsd, remainingUsd, pctPaid }
  })

  const grandTotal     = commitments.reduce((s, c) => s + c.usd, 0)
  const grandPaid      = commitments.reduce((s, c) => s + c.paidUsd, 0)
  const grandRemaining = commitments.reduce((s, c) => s + c.remainingUsd, 0)
  const grandPct = grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0

  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4 py-4 pb-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted mb-4 hover:text-primary transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 rotate-180">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        חזרה לדשבורד
      </Link>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-[#6c2d45] to-[#4f1f33] text-white p-5 mb-5 shadow-lg">
        <p className="text-white/70 text-sm">סך כל התחייבויות</p>
        <p className="text-4xl font-extrabold mt-1 tracking-tight">{usd(grandTotal)}</p>
        <div className="flex items-center gap-5 mt-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-2.5 rounded-full bg-[#d4af37]" />
            שולם <b>{usd(grandPaid)}</b>
          </span>
          <span className="text-white/70">נשאר <b>{usd(grandRemaining)}</b></span>
          <span className="font-bold text-[#d4af37]">{grandPct}%</span>
        </div>
        <div className="rounded-full mt-3" style={{ background: 'rgba(255,255,255,0.2)', height: 8 }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${grandPct}%`, background: '#d4af37' }}
          />
        </div>
      </div>

      <CommitmentsClient groups={groups} />
    </div>
  )
}

export default function CommitmentsPage() {
  return (
    <Suspense
      fallback={
        <div dir="rtl" className="max-w-3xl mx-auto px-4 py-4 animate-pulse space-y-3">
          <div className="h-5 w-24 bg-surface rounded" />
          <div className="h-36 bg-surface rounded-2xl" />
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface rounded-xl" />)}
        </div>
      }
    >
      <CommitmentsContent />
    </Suspense>
  )
}
