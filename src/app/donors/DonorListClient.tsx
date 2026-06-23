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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((donor) => (
          <DonorCard key={donor.id} donor={donor} />
        ))}
      </div>

      {remaining > 0 && (
        <button
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full mt-4 py-3 rounded-xl border border-border text-sm font-semibold text-primary hover:border-primary/40 hover:bg-primary-light transition-all active:scale-[0.98]"
        >
          טען עוד ({remaining} נוספים)
        </button>
      )}
    </>
  )
}
