import { getAllDonors } from '@/lib/api'
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

function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fDate(d: string) {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  } catch { return d }
}

const FUNDS = [
  { key: 'קרן הבניין', label: 'קרן הבניין', goalUSD: 500000, color: 'bg-primary', light: 'bg-primary-light', text: 'text-primary' },
  { key: 'קרן החינוך', label: 'קרן החינוך', goalUSD: 300000, color: 'bg-accent', light: 'bg-[#fef9e7]', text: 'text-[#92400e]' },
  { key: 'עזרה דחופה', label: 'עזרה דחופה', goalUSD: 150000, color: 'bg-[#059669]', light: 'bg-[#d1fae5]', text: 'text-[#065f46]' },
]

export default async function PurposeReport() {
  const donors = await getAllDonors()
  const allDonations: Donation[] = donors.flatMap((d) => d.donations)

  const paid = allDonations.filter((d) => {
    const ps = d.paymentStatus.toLowerCase()
    return ps.includes('שולם') || (!ps.includes('בוטל') && !ps.includes('ממתין'))
  })

  const total = paid.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-1">דוח לפי ייעוד</h1>
      <p className="text-sm text-muted mb-5">התקדמות לפי קרן</p>

      <div className="space-y-5">
        {FUNDS.map((fund) => {
          const fundDonations = paid.filter((d) => d.designation === fund.key)
          const collected = fundDonations.reduce((s, d) => s + d.amount, 0)
          const pct = Math.min(100, Math.round((collected / fund.goalUSD) * 100))
          const recent = [...fundDonations]
            .sort((a, b) => (a.donationDate || '') < (b.donationDate || '') ? 1 : -1)
            .slice(0, 3)

          return (
            <div key={fund.key} className="bg-surface rounded-[--radius-card] border border-border overflow-hidden">
              <div className={`px-4 py-4 ${fund.light}`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`font-bold text-lg ${fund.text}`}>{fund.label}</h2>
                  <span className={`text-sm font-bold ${fund.text}`}>{pct}%</span>
                </div>

                <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${fund.color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between mt-2 text-sm">
                  <span className={`font-semibold ${fund.text}`}>{fUSD(collected)}</span>
                  <span className="text-muted text-xs">יעד: {fUSD(fund.goalUSD)}</span>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-muted mb-2">תרומות אחרונות</p>
                {recent.length === 0 ? (
                  <p className="text-xs text-muted">אין תרומות עדיין</p>
                ) : (
                  <div className="space-y-2">
                    {recent.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${fund.color}`} />
                          <span className="text-text truncate">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-muted">{fDate(d.donationDate)}</span>
                          <span className="font-semibold text-primary">{fAmount(d.amount, d.currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 bg-primary rounded-[--radius-card] px-4 py-4 text-white">
        <p className="text-white/70 text-xs mb-1">סה"כ תקבולים (כל הקרנות)</p>
        <p className="text-2xl font-bold">{fUSD(total)}</p>
        <p className="text-white/60 text-xs mt-1">{paid.length} תרומות</p>
      </div>
    </div>
  )
}
