import { connection } from 'next/server'
import { getDataBundle } from '@/lib/monday'
import HomeClient from './components/HomeClient'

export default async function HomePage() {
  await connection()

  let bundle
  try {
    bundle = await getDataBundle()
  } catch {
    return (
      <div dir="rtl" style={{ padding: 32, color: '#6c2d45' }}>
        שגיאה בטעינת הנתונים. נסו שוב מאוחר יותר.
      </div>
    )
  }

  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() // 0-11

  // Per-month income (USD) for the current calendar year, including future
  // (projected) donations. Cancelled donations are excluded.
  const months = Array.from({ length: 12 }, (_, m) => {
    const inMonth = bundle.donations.filter((d) => {
      if (!d.date || d.paymentStatus === 'בוטל') return false
      const dt = new Date(d.date)
      return dt.getFullYear() === year && dt.getMonth() === m
    })
    const received = inMonth.filter((d) => !d.isFuture).reduce((s, d) => s + d.usd, 0)
    const future = inMonth.filter((d) => d.isFuture).reduce((s, d) => s + d.usd, 0)
    return { month: m, received, future, total: received + future, count: inMonth.length }
  })

  const yearReceived = months.reduce((s, x) => s + x.received, 0)
  const yearFuture = months.reduce((s, x) => s + x.future, 0)

  // Commitments roll-up (for the entry button preview)
  const totalCommitted = bundle.commitments.reduce((s, c) => s + c.usd, 0)
  const totalPaid = bundle.commitments.reduce((s, c) => s + c.paidUsd, 0)

  return (
    <HomeClient
      year={year}
      currentMonth={currentMonth}
      months={months}
      yearReceived={yearReceived}
      yearFuture={yearFuture}
      totalCommitted={totalCommitted}
      totalPaid={totalPaid}
      donorCount={bundle.donors.length}
    />
  )
}
