import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getDonorDetail } from '@/lib/monday'
import { ClassificationBadge } from '@/components/StatusBadge'
import type { Donation, Commitment } from '@/lib/types'

export const maxDuration = 300
function fUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fAmount(n: number, currency: string) {
  const cur = currency?.toUpperCase()
  if (!cur || cur === 'USD' || cur === '$') return fUSD(n)
  if (cur === 'ILS' || cur === '₪') {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
  }
  return `${currency}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`
}

function fDate(d: string) {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  } catch {
    return d
  }
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm whitespace-nowrap ${className}`}>{children ?? ''}</td>
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-semibold text-muted text-start bg-background whitespace-nowrap border-b border-border">
      {children}
    </th>
  )
}

function StatusPill({ label }: { label: string }) {
  if (!label) return null
  const lower = label.toLowerCase()
  const cls =
    lower.includes('שולם') || lower.includes('פעיל')
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

function YearStat({
  year,
  commitments,
  donations,
  balance,
}: {
  year: string
  commitments: number
  donations: number
  balance: number
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-3">
      <p className="text-xs font-bold text-primary mb-2">{year}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted leading-none mb-1">התחייבויות</p>
          <p className="text-xs font-semibold text-text">{fUSD(commitments)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted leading-none mb-1">תרומות</p>
          <p className="text-xs font-semibold text-text">{fUSD(donations)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted leading-none mb-1">יתרה</p>
          <p className={`text-xs font-bold ${balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
            {fUSD(balance)}
          </p>
        </div>
      </div>
    </div>
  )
}

function DonorPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 animate-pulse">
      <div className="h-5 w-28 bg-surface rounded mb-4" />
      <div className="bg-surface rounded-[--radius-card] h-32 mb-4" />
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[...Array(3)].map((_, i) => <div key={i} className="bg-surface rounded-[--radius-card] h-16" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[...Array(2)].map((_, i) => <div key={i} className="bg-surface rounded-xl h-20" />)}
      </div>
      <div className="bg-surface rounded-[--radius-card] h-40" />
    </div>
  )
}

async function DonorContent({ id }: { id: string }) {
  await connection()
  // Monday item IDs are numeric — reject anything else before hitting the API
  if (!/^\d{5,15}$/.test(id)) notFound()
  const donor = await getDonorDetail(id)
  if (!donor) notFound()

  const sortedDonations = [...donor.donations].sort((a, b) =>
    (a.donationDate || '') < (b.donationDate || '') ? 1 : -1
  )
  const sortedCommitments = [...donor.commitments].sort((a, b) =>
    (a.commitmentDate || '') < (b.commitmentDate || '') ? 1 : -1
  )

  const displayName = donor.hebrewName || donor.name

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted mb-4 hover:text-primary transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 rotate-180">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        חזרה לרשימה
      </Link>

      <div className="bg-primary rounded-[--radius-card] p-5 mb-4 text-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">{displayName.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{displayName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {donor.city && <p className="text-white/70 text-sm">{donor.city}</p>}
                {donor.donorNumber && (
                  <span className="text-accent text-xs font-mono">#{donor.donorNumber}</span>
                )}
              </div>
              {donor.email && (
                <p className="text-white/60 text-xs mt-0.5">{donor.email}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ClassificationBadge classification={donor.classification || 'רגיל'} />
            {donor.currency && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {donor.currency}
              </span>
            )}
          </div>
        </div>
        {donor.phone && (
          <a
            href={`tel:${donor.phone}`}
            className="mt-4 inline-flex items-center gap-2 text-sm text-accent font-medium"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {donor.phone}
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-surface rounded-[--radius-card] border border-border p-3 text-center">
          <p className="text-xs text-muted mb-1">סך התחייבויות</p>
          <p className="font-bold text-text">{fUSD(donor.totalCommitments)}</p>
        </div>
        <div className="bg-surface rounded-[--radius-card] border border-border p-3 text-center">
          <p className="text-xs text-muted mb-1">סך תרומות</p>
          <p className="font-bold text-primary">{fUSD(donor.totalDonations)}</p>
        </div>
        <div className="bg-surface rounded-[--radius-card] border border-border p-3 text-center">
          <p className="text-xs text-muted mb-1">יתרת השלמה</p>
          <p className={`font-bold ${donor.balance > 0 ? 'text-cancelled' : 'text-paid'}`}>
            {fUSD(donor.balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <YearStat
          year="2025"
          commitments={donor.commitments2025}
          donations={donor.donations2025}
          balance={donor.balance2025}
        />
        <YearStat
          year="2026"
          commitments={donor.commitments2026}
          donations={donor.donations2026}
          balance={donor.balance2026}
        />
      </div>

      <div className="flex gap-3 mb-6">
        <Link
          href={`/donations/new?donorId=${donor.id}&donorName=${encodeURIComponent(displayName)}`}
          className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold text-center hover:bg-primary-hover transition-colors"
        >
          הוספת תרומה
        </Link>
        <button className="flex-1 bg-surface border border-border rounded-xl py-2.5 text-sm font-semibold text-text hover:bg-background transition-colors">
          עריכת פרטים
        </button>
      </div>

      <section className="mb-6">
        <h2 className="font-bold text-text text-lg mb-3">
          תרומות
          <span className="text-sm font-normal text-muted me-2">({sortedDonations.length})</span>
        </h2>

        {sortedDonations.length === 0 ? (
          <div className="bg-surface rounded-[--radius-card] border border-border p-8 text-center text-muted text-sm">
            אין תרומות
          </div>
        ) : (
          <div className="bg-surface rounded-[--radius-card] border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>תאריך</Th>
                    <Th>סכום</Th>
                    <Th>מטבע</Th>
                    <Th>ייעוד</Th>
                    <Th>סטטוס תשלום</Th>
                    <Th>שיטת תשלום</Th>
                    <Th>סוג תרומה</Th>
                    <Th>הערות</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedDonations.map((d: Donation) => (
                    <tr key={d.id} className="hover:bg-background/60 transition-colors">
                      <Cell>{fDate(d.donationDate)}</Cell>
                      <Cell className="font-semibold text-primary">
                        {d.amount ? fAmount(d.amount, d.currency) : ''}
                      </Cell>
                      <Cell>
                        {d.currency && (
                          <span className="bg-background px-2 py-0.5 rounded text-xs font-mono">
                            {d.currency}
                          </span>
                        )}
                      </Cell>
                      <Cell>{d.designation}</Cell>
                      <Cell>
                        <StatusPill label={d.paymentStatus} />
                      </Cell>
                      <Cell className="text-muted">{d.paymentMethod}</Cell>
                      <Cell className="text-muted">{d.donationType}</Cell>
                      <Cell className="text-muted max-w-[160px] truncate">{d.notes}</Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-text text-lg mb-3">
          התחייבויות
          <span className="text-sm font-normal text-muted me-2">({sortedCommitments.length})</span>
        </h2>

        {sortedCommitments.length === 0 ? (
          <div className="bg-surface rounded-[--radius-card] border border-border p-8 text-center text-muted text-sm">
            אין התחייבויות
          </div>
        ) : (
          <div className="bg-surface rounded-[--radius-card] border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>תאריך</Th>
                    <Th>סכום</Th>
                    <Th>מטבע</Th>
                    <Th>ייעוד</Th>
                    <Th>סטטוס</Th>
                    <Th>סוג</Th>
                    <Th>הערות</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedCommitments.map((c: Commitment) => (
                    <tr key={c.id} className="hover:bg-background/60 transition-colors">
                      <Cell>{fDate(c.commitmentDate)}</Cell>
                      <Cell className="font-semibold text-primary">
                        {c.amount ? fAmount(c.amount, c.currency) : ''}
                      </Cell>
                      <Cell>
                        {c.currency && (
                          <span className="bg-background px-2 py-0.5 rounded text-xs font-mono">
                            {c.currency}
                          </span>
                        )}
                      </Cell>
                      <Cell>{c.designation}</Cell>
                      <Cell>
                        <StatusPill label={c.status} />
                      </Cell>
                      <Cell className="text-muted">{c.commitmentType}</Cell>
                      <Cell className="text-muted max-w-[160px] truncate">{c.notes}</Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default async function DonorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<DonorPageSkeleton />}>
      {params.then(({ id }) => (
        <DonorContent id={id} />
      ))}
    </Suspense>
  )
}
