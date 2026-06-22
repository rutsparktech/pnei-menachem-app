import { Suspense } from 'react'
import { getHomeSummary } from '@/lib/monday'
import HomeClient from './components/HomeClient'

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeData />
    </Suspense>
  )
}

async function HomeData() {
  let summary
  try {
    summary = await getHomeSummary()
  } catch {
    return (
      <div dir="rtl" style={{ padding: 32, color: '#6c2d45' }}>
        שגיאה בטעינת הנתונים. נסו שוב מאוחר יותר.
      </div>
    )
  }
  return <HomeClient {...summary} />
}

function HomeSkeleton() {
  return (
    <div dir="rtl" className="px-4 pt-3 pb-6 max-w-3xl mx-auto animate-pulse">
      {/* Hero skeleton */}
      <section className="rounded-2xl bg-gradient-to-bl from-[#6c2d45] to-[#4f1f33] p-5 mb-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="h-3.5 w-32 bg-white/20 rounded mb-3" />
            <div className="h-10 w-48 bg-white/25 rounded mb-3" />
            <div className="flex gap-4">
              <div className="h-3 w-28 bg-white/20 rounded" />
              <div className="h-3 w-24 bg-white/15 rounded" />
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0" />
        </div>
      </section>

      {/* Month grid skeleton */}
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="h-5 w-36 bg-border rounded" />
        <div className="h-3 w-28 bg-border/60 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="rounded-xl p-3.5 min-h-[92px] flex flex-col justify-between border border-border bg-surface">
            <div className="h-3.5 w-12 bg-border rounded" />
            <div className="h-5 w-20 bg-border/70 rounded mt-auto" />
          </div>
        ))}
      </div>

      {/* Commitments card skeleton */}
      <div className="rounded-2xl bg-surface border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-full bg-border" />
          <div className="flex-1">
            <div className="h-4 w-40 bg-border rounded mb-1.5" />
            <div className="h-3 w-56 bg-border/60 rounded" />
          </div>
        </div>
        <div className="h-3 w-full bg-border/50 rounded mb-1.5" />
        <div className="h-2.5 bg-border rounded-full">
          <div className="h-full w-1/3 bg-primary/20 rounded-full" />
        </div>
      </div>

      <div className="h-3 w-28 bg-border/50 rounded mx-auto mt-5" />
    </div>
  )
}
