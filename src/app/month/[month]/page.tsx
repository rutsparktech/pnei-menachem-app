import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDataBundle } from '@/lib/monday'
import { MONTHS_HE, usd, orderDesignations, designationColor } from '@/lib/format'
import MonthClient from './MonthClient'

export const revalidate = 3600

async function MonthContent({ month }: { month: string }) {
  const [yearStr, monthStr] = month.split('-')
  const year = parseInt(yearStr, 10)
  const monthIndex = parseInt(monthStr, 10) - 1

  if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) notFound()

  const { donations } = await getDataBundle()

  const monthDonations = donations.filter((d) => {
    if (!d.date || d.paymentStatus === '\u05d1\u05d5\u05d8\u05dc') return false
    const dt = new Date(d.date)
    return dt.getFullYear() === year && dt.getMonth() === monthIndex
  })

  type DonorRow = {
    donorId: string; donorName: string; amount: number
    currency: string; usdAmt: number; isFuture: boolean
  }

  const map = new Map<string, DonorRow[]>()
  for (const d of monthDonations) {
    const key = d.designation || '\u05e9\u05d5\u05e0\u05d5\u05ea'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({
      donorId: d.donorId || '', donorName: d.donorName,
      amount: d.amount, currency: d.currency, usdAmt: d.usd, isFuture: d.isFuture,
    })
  }

  const groups = orderDesignations([...map.keys()]).map((designation) => {
    const donors = map.get(designation)!.sort((a, b) => b.usdAmt - a.usdAmt)
    return {
      designation,
      color: designationColor(designation),
      donors,
      total: donors.reduce((s, d) => s + d.usdAmt, 0),
    }
  })

  const totalReceived = monthDonations.filter((d) => !d.isFuture).reduce((s, d) => s + d.usd, 0)
  const totalFuture   = monthDonations.filter((d) =>  d.isFuture).reduce((s, d) => s + d.usd, 0)

  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4 py-4 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted mb-4 hover:text-primary transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 rotate-180">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        \u05d7\u05d6\u05e8\u05d4 \u05dc\u05d3\u05e9\u05d1\u05d5\u05e8\u05d3
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-primary">{MONTHS_HE[monthIndex]} {year}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm">
          <span className="font-bold text-text">{usd(totalReceived)}</span>
          {totalFuture > 0 && (
            <span className="text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#e0cfa0]" />
              {usd(totalFuture)} \u05e6\u05e4\u05d5\u05d9
            </span>
          )}
          <span className="text-muted">· {monthDonations.length} \u05ea\u05e8\u05d5\u05de\u05d5\u05ea</span>
        </div>
      </div>

      <MonthClient groups={groups} />
    </div>
  )
}

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params
  return (
    <Suspense
      fallback={
        <div dir="rtl" className="max-w-3xl mx-auto px-4 py-4 animate-pulse space-y-3">
          <div className="h-5 w-24 bg-surface rounded" />
          <div className="h-10 w-40 bg-surface rounded" />
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface rounded-xl" />)}
        </div>
      }
    >
      <MonthContent month={month} />
    </Suspense>
  )
}
