import Link from 'next/link'
import Image from 'next/image'
import { usd, pct, MONTHS_HE } from '@/lib/format'

type MonthData = { month: number; received: number; future: number; total: number; count: number }

type Props = {
  year: number
  currentMonth: number
  months: MonthData[]
  yearReceived: number
  yearFuture: number
  totalCommitted: number
  totalPaid: number
  donorCount: number
}

export default function HomeClient({
  year, currentMonth, months, yearReceived, yearFuture, totalCommitted, totalPaid, donorCount,
}: Props) {
  const yearTotal = yearReceived + yearFuture
  const committedPct = totalCommitted > 0 ? Math.round((totalPaid / totalCommitted) * 100) : 0

  return (
    <div dir="rtl" className="px-4 pt-3 pb-6 max-w-3xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-[#6c2d45] to-[#4f1f33] text-white p-5 mb-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/70 text-sm">סקירת תרומות {year}</p>
            <p className="text-4xl font-extrabold mt-1 tracking-tight">{usd(yearTotal)}</p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                התקבל <b className="font-bold">{usd(yearReceived)}</b>
              </span>
              {yearFuture > 0 && (
                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/50" />
                  צפי <b className="font-bold">{usd(yearFuture)}</b>
                </span>
              )}
            </div>
          </div>
          <Image src="/emblem.png" alt="פני מנחם" width={56} height={52} className="opacity-90 flex-shrink-0" priority />
        </div>
      </section>

      {/* Months */}
      <div className="flex items-baseline justify-between mb-2.5">
        <h2 className="font-bold text-text text-lg">תרומות לפי חודש</h2>
        <span className="text-xs text-muted">לחצו על חודש לפירוט לפי ייעוד</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
        {months.map((m) => {
          const isCurrent = m.month === currentMonth
          const isFuture = m.month > currentMonth
          const empty = m.total === 0
          return (
            <Link
              key={m.month}
              href={`/month/${year}-${String(m.month + 1).padStart(2, '0')}`}
              className={[
                'group relative rounded-xl p-3.5 min-h-[92px] flex flex-col justify-between transition-all active:scale-[0.97] border',
                isCurrent
                  ? 'bg-primary text-white border-accent ring-2 ring-accent shadow-md'
                  : isFuture
                  ? 'bg-[#fbf7ee] text-text border-dashed border-[#e0cfa0] hover:border-accent'
                  : 'bg-surface text-text border-border hover:border-primary/40 hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-primary'}`}>
                  {MONTHS_HE[m.month]}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-accent text-primary font-bold px-1.5 py-0.5 rounded-full">החודש</span>
                )}
                {isFuture && (
                  <span className="text-[10px] bg-[#e0cfa0]/40 text-[#8a6d1f] font-bold px-1.5 py-0.5 rounded-full">צפי</span>
                )}
              </div>
              <div>
                <p className={`text-lg font-extrabold leading-tight ${isCurrent ? 'text-white' : empty ? 'text-muted/50' : 'text-text'}`}>
                  {empty ? '—' : usd(m.total)}
                </p>
                {m.future > 0 && m.received > 0 && (
                  <p className={`text-[11px] mt-0.5 ${isCurrent ? 'text-white/70' : 'text-muted'}`}>
                    {usd(m.received)} + {usd(m.future)} צפי
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Commitments entry */}
      <Link
        href="/commitments"
        className="block rounded-2xl bg-surface border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6c2d45" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </span>
            <div>
              <p className="font-bold text-text text-base">התחייבויות לפי ייעוד</p>
              <p className="text-xs text-muted">כמה נכנס, כמה נשאר, ואחוז השלמה</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth={2} className="w-5 h-5 rotate-180">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted">סך התחייבויות <b className="text-text">{usd(totalCommitted)}</b></span>
          <span className="text-primary font-bold">{pct(committedPct)} הושלם</span>
        </div>
        <div className="h-2.5 bg-primary-light rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${committedPct}%` }} />
        </div>
      </Link>

      <p className="text-center text-xs text-muted mt-5">{donorCount} תורמים במערכת</p>
    </div>
  )
}
