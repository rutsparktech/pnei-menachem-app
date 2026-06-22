'use client'

import { useState } from 'react'
import DonorCard from './DonorCard'
import KpiCard from './KpiCard'
import type { DonorWithDetails } from '@/lib/types'

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function DonorsList({ donors }: { donors: DonorWithDetails[] }) {
  const [q, setQ] = useState('')

  const totalCommitments = donors.reduce((s, d) => s + d.totalCommitments, 0)
  const totalDonations = donors.reduce((s, d) => s + d.totalDonations, 0)
  const totalBalance = donors.reduce((s, d) => s + d.balance, 0)
  const activeDonors = donors.filter((d) => d.totalCommitments > 0).length

  const filtered = q
    ? donors.filter(
        (d) =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.hebrewName.includes(q) ||
          d.city.includes(q) ||
          d.donorNumber.includes(q)
      )
    : donors

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard label='סה"כ התחייבויות' value={fUSD(totalCommitments)} accent />
        <KpiCard label='סה"כ תרומות' value={fUSD(totalDonations)} />
        <KpiCard label="יתרה לגבייה" value={fUSD(totalBalance)} sub={totalBalance > 0 ? 'לגבייה' : 'מאוזן'} />
        <KpiCard
          label="תורמים פעילים"
          value={activeDonors.toString()}
          sub={`מתוך ${donors.length} תורמים`}
        />
      </div>

      <div className="relative mb-5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש לפי שם, עיר או מספר תורם..."
          className="w-full bg-surface border border-border rounded-xl py-2.5 pe-10 ps-4 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-text text-lg">תורמים</h2>
        <span className="text-sm text-muted">{filtered.length} רשומות</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-lg">לא נמצאו תורמים</p>
          {q && <p className="text-sm mt-1">נסה חיפוש אחר</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((donor) => (
            <DonorCard key={donor.id} donor={donor} />
          ))}
        </div>
      )}
    </>
  )
}
