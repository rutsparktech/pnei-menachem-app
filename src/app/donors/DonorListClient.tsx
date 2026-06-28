'use client'

import { useState } from 'react'
import DonorCard from '@/components/DonorCard'
import type { Donor } from '@/lib/types'

const PAGE_SIZE = 20

export default function DonorListClient({ donors }: { donors: Donor[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = donors.slice(0, visibleCount)
  const remaining = donors.length - visibleCount

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((donor) => (
          <DonorCard key={donor.id} donor={donor} />
        ))}
      </div>

      {remaining > 0 && (
        <button
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full mt-4 py-3 rounded-xl border border-white/20 text-sm font-semibold text-white/80 hover:border-white/40 hover:bg-white/10 transition-all active:scale-[0.98]"
        >
          טען עוד ({remaining} נוספים)
        </button>
      )}
    </>
  )
}
