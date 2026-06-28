'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

function timeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'עכשיו'
  if (minutes === 1) return 'לפני דקה'
  return `לפני ${minutes} דקות`
}

export default function RefreshButton({ lastUpdated }: { lastUpdated: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncTime, setSyncTime] = useState(() => new Date(lastUpdated))
  const [label, setLabel] = useState(() => timeAgo(new Date(lastUpdated)))

  useEffect(() => {
    const date = new Date(lastUpdated)
    setSyncTime(date)
    setLabel(timeAgo(date))
  }, [lastUpdated])

  useEffect(() => {
    const id = setInterval(() => setLabel(timeAgo(syncTime)), 60_000)
    return () => clearInterval(id)
  }, [syncTime])

  return (
    <div className="flex items-center justify-between mb-5">
      <p className="text-xs text-white/50">
        עודכן לאחרונה: {label}
      </p>
      <button
        onClick={() => startTransition(() => { router.refresh() })}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-white/80 border border-white/20 bg-white/10 px-3 py-1.5 rounded-lg hover:border-white/40 hover:bg-white/15 transition-all active:scale-95 disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {isPending ? 'טוען...' : 'רענן נתונים'}
      </button>
    </div>
  )
}
