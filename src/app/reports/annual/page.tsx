import { Suspense } from 'react'
import { getAllDonors } from '@/lib/api'
import SearchInput from '@/components/SearchInput'
import type { Donation } from '@/lib/types'

function fAmount(n: number, currency: string) {
  const cur = currency?.toUpperCase()
  if (!cur || cur === 'USD' || cur === '$') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  }
  if (cur === 'ILS' || cur === '₪') {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
  }
  return `${currency}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`
}

function fDate(d: string) {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  } catch { return d }
}

function StatusPill({ label }: { label: string }) {
  if (!label) return null
  const lower = label.toLowerCase()
  const cls = lower.includes('שולם')
    ? 'bg-paid-bg text-paid'
    : lower.includes('בוטל') || lower.includes('בטל')
    ? 'bg-cancelled-bg text-cancelled'
    : 'bg-pending-bg text-pending'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

async function ReportTable({ q, status }: { q?: string; status?: string }) {
  const donors = await getAllDonors()
  let donations: (Donation & { donorName: string })[] = donors.flatMap((d) =>
    d.donations.map((don) => ({ ...don, donorName: d.hebrewName || d.name }))
  )

  if (q) {
    donations = donations.filter(
      (d) => d.name.includes(q) || d.designation.includes(q) || d.donorName.includes(q)
    )
  }
  if (status && status !== 'all') {
    const lower = status.toLowerCase()
    donations = donations.filter((d) => {
      const ps = d.paymentStatus.toLowerCase()
      if (lower === 'paid') return ps.includes('שולם')
      if (lower === 'cancelled') return ps.includes('בוטל') || ps.includes('בטל')
      if (lower === 'pending') return !ps.includes('שולם') && !ps.includes('בוטל') && !ps.includes('בטל')
      return true
    })
  }

  donations = [...donations].sort((a, b) =>
    (a.donationDate || '') < (b.donationDate || '') ? 1 : -1
  )

  return (
    <div className="bg-surface rounded-[--radius-card] border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              {['תורם', 'שם תרומה', 'תאריך', 'סכום', 'מטבע', 'ייעוד', 'סטטוס תשלום', 'שיטת תשלום'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-xs font-semibold text-muted text-start whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {donations.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted text-sm">לא נמצאו תוצאות</td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-border">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-background/60 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-medium text-primary truncate max-w-[120px]">{d.donorName}</td>
                  <td className="px-3 py-2.5 text-sm">
                    <p className="font-medium text-text truncate max-w-[140px]">{d.name}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted whitespace-nowrap">{fDate(d.donationDate)}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-primary whitespace-nowrap">
                    {d.amount ? fAmount(d.amount, d.currency) : ''}
                  </td>
                  <td className="px-3 py-2.5">
                    {d.currency && (
                      <span className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">{d.currency}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-text whitespace-nowrap">{d.designation || ''}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusPill label={d.paymentStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted whitespace-nowrap">{d.paymentMethod || ''}</td>
                </tr>
              ))}
            </tbody>
          )}
          <tfoot>
            <tr className="border-t-2 border-border bg-background">
              <td className="px-3 py-2 text-xs font-bold text-muted" colSpan={8}>
                {donations.length} רשומות
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function StatusFilter({ current }: { current?: string }) {
  const options = [
    { value: 'all', label: 'הכל' },
    { value: 'paid', label: 'שולם' },
    { value: 'pending', label: 'ממתין' },
    { value: 'cancelled', label: 'בוטל' },
  ]
  return (
    <div className="flex gap-1.5 bg-surface border border-border rounded-xl p-1">
      {options.map((o) => (
        <a
          key={o.value}
          href={`?status=${o.value}`}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            (current ?? 'all') === o.value ? 'bg-primary text-white' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </a>
      ))}
    </div>
  )
}

export default async function AnnualReport({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-1">דוח שנתי</h1>
      <p className="text-sm text-muted mb-5">רשימת כל התרומות</p>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-48">
          <Suspense>
            <SearchInput placeholder="חיפוש לפי שם תרומה, תורם או ייעוד..." />
          </Suspense>
        </div>
        <Suspense>
          <StatusFilter current={status} />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-surface rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        }
      >
        <ReportTable q={q} status={status} />
      </Suspense>
    </div>
  )
}
