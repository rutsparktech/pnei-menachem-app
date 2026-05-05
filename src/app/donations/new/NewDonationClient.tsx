'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Donor } from '@/lib/types'

const PURPOSES = ['קרן הבניין', 'קרן החינוך', 'עזרה דחופה', 'כללי']
const CURRENCIES = ['₪', '$', '€', '£']
const PAYMENT_METHODS = ['העברה בנקאית', 'מזומן', 'צ\'ק', 'אשראי', 'PayPal', 'אחר']

export default function NewDonationClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('donorId')
  const preselectedName = searchParams.get('donorName')

  const [donors, setDonors] = useState<Donor[]>([])
  const [donorSearch, setDonorSearch] = useState(preselectedName ?? '')
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    amount: '',
    currency: '₪',
    date: new Date().toISOString().split('T')[0],
    purpose: PURPOSES[0],
    paymentMethod: PAYMENT_METHODS[0],
    notes: '',
  })

  useEffect(() => {
    fetch('/api/donors')
      .then((r) => r.json())
      .then((data: { donors: Donor[] }) => {
        const list = data.donors ?? []
        setDonors(list)
        if (preselectedId) {
          const d = list.find((d) => d.id === preselectedId)
          if (d) setSelectedDonor(d)
        }
      })
      .catch(() => {})
  }, [preselectedId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredDonors = donorSearch
    ? donors.filter((d) => d.name.includes(donorSearch) || d.city.includes(donorSearch))
    : donors.slice(0, 8)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!selectedDonor) { setError('יש לבחור תורם'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('יש להזין סכום תקין'); return }

    startTransition(async () => {
      try {
        const res = await fetch('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donorId: selectedDonor.id,
            donorName: selectedDonor.hebrewName || selectedDonor.name,
            ...form,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          setError(err.error ?? 'שגיאה בשמירה')
          return
        }
        setSuccess(true)
        setTimeout(() => router.push(`/donor/${selectedDonor.id}`), 1500)
      } catch {
        setError('שגיאת רשת, נסה שנית')
      }
    })
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4">
        <div className="w-16 h-16 rounded-full bg-paid-bg flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-8 h-8 text-paid">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-xl font-bold text-text">התרומה נשמרה בהצלחה!</p>
        <p className="text-sm text-muted">מועבר לפרופיל התורם...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/" className="text-muted hover:text-primary transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 rotate-180">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">הוספת תרומה</h1>
          <p className="text-xs text-muted">מילוי פרטי תרומה חדשה</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Donor selector */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-semibold text-text mb-1.5">
            תורם <span className="text-cancelled">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={selectedDonor ? (selectedDonor.hebrewName || selectedDonor.name) : donorSearch}
              onChange={(e) => {
                setDonorSearch(e.target.value)
                setSelectedDonor(null)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="חיפוש תורם..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {selectedDonor && (
              <button
                type="button"
                onClick={() => { setSelectedDonor(null); setDonorSearch('') }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {showDropdown && !selectedDonor && (
            <div className="absolute z-20 top-full mt-1 w-full bg-surface border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredDonors.length === 0 ? (
                <p className="text-sm text-muted px-4 py-3">לא נמצאו תורמים</p>
              ) : (
                filteredDonors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="w-full text-start px-4 py-2.5 hover:bg-background transition-colors flex items-center justify-between gap-2"
                    onClick={() => { setSelectedDonor(d); setDonorSearch(d.hebrewName || d.name); setShowDropdown(false) }}
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{d.hebrewName || d.name}</p>
                      <p className="text-xs text-muted">{d.city}</p>
                    </div>
                    <span className="text-xs text-muted">{d.classification}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Amount + Currency */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1.5">
            סכום <span className="text-cancelled">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1.5">
            תאריך <span className="text-cancelled">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1.5">
            ייעוד <span className="text-cancelled">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PURPOSES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, purpose: p })}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  form.purpose === p
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text border-border hover:border-primary/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1.5">שיטת תשלום</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1.5">הערות</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="הערות נוספות (אופציונלי)..."
            rows={3}
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {error && (
          <div className="bg-cancelled-bg text-cancelled rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base"
        >
          {isPending ? 'שומר...' : 'שמירת תרומה'}
        </button>
      </form>
    </div>
  )
}
