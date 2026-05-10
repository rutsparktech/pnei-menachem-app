'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

type TopDonor = { id: string; name: string; totalDonations: number; donations2026: number }

type Props = {
  totalDonations: number
  totalCommitments: number
  balance: number
  activeDonors: number
  donations2025: number
  donations2026: number
  commitments2025: number
  commitments2026: number
  byMonth2026: number[]
  topDonors: TopDonor[]
}

const MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ']
const COLORS = ['#6c2d45', '#d4af37', '#9b4e6a', '#e8c96b', '#c47a8a', '#b8a040']
const fmt = (n: number) => n.toLocaleString('he-IL')
const card: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e0d0d8' }

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...card, padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

export default function DashboardClient(props: Props) {
  const {
    totalDonations, totalCommitments, balance, activeDonors,
    donations2025, donations2026, commitments2025, commitments2026,
    byMonth2026, topDonors,
  } = props

  const doughnutRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const charts = useRef<{ d?: any; b?: any }>({})

  const top6 = [...topDonors].sort((a, b) => b.donations2026 - a.donations2026).filter((d) => d.donations2026 > 0).slice(0, 6)
  const maxDonation = Math.max(...topDonors.map((d) => d.totalDonations), 1)
  const maxYear = Math.max(donations2025, donations2026, commitments2025, commitments2026, 1)
  const balance2025 = Math.max(0, commitments2025 - donations2025)
  const balance2026 = Math.max(0, commitments2026 - donations2026)

  useEffect(() => {
    const init = () => {
      charts.current.d?.destroy()
      charts.current.b?.destroy()

      if (doughnutRef.current) {
        charts.current.d = new (window as any).Chart(doughnutRef.current, {
          type: 'doughnut',
          data: {
            labels: top6.map((d) => d.name),
            datasets: [{ data: top6.map((d) => d.donations2026), backgroundColor: COLORS, borderWidth: 0 }],
          },
          options: { plugins: { legend: { display: false } }, cutout: '65%' },
        })
      }

      if (barRef.current) {
        charts.current.b = new (window as any).Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: MONTHS,
            datasets: [{ data: byMonth2026, backgroundColor: '#6c2d45', borderRadius: 4, label: 'תרומות' }],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: (v: any) => fmt(Number(v)) } } },
          },
        })
      }
    }

    if ((window as any).Chart) {
      init()
    } else {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      s.onload = init
      document.head.appendChild(s)
    }

    return () => {
      charts.current.d?.destroy()
      charts.current.b?.destroy()
    }
  }, [])

  const navLinks = [
    { label: 'דשבורד', href: '/', active: true },
    { label: 'תורמים', href: '/donors' },
    { label: 'תרומות', href: '/donations' },
    { label: 'התחייבויות', href: '/commitments' },
  ]

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f7f3f5', fontFamily: 'sans-serif', color: '#222' }}>
      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e0d0d8', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d4af37', display: 'inline-block' }} />
          <span style={{ color: '#6c2d45', fontWeight: 700, fontSize: 16 }}>פני מנחם — מרכז תורמים</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {navLinks.map(({ label, href, active }) => (
            <Link key={label} href={href} style={{
              padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 14,
              background: active ? '#6c2d45' : 'transparent',
              color: active ? '#fff' : '#6c2d45',
              fontWeight: active ? 600 : 400,
            }}>{label}</Link>
          ))}
        </div>
      </nav>

      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <KpiCard label='סך תרומות כולל' value={fmt(totalDonations)} color='#d4af37' />
          <KpiCard label='סך התחייבויות' value={fmt(totalCommitments)} color='#6c2d45' />
          <KpiCard label='יתרה לגבייה' value={fmt(balance)} color={balance > 0 ? '#c0392b' : '#27ae60'} />
          <KpiCard label='תורמים פעילים' value={String(activeDonors)} color='#27ae60' />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 24 }}>
          {/* Doughnut */}
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ color: '#6c2d45', margin: '0 0 16px', fontSize: 15 }}>חלוקת תרומות 2026 לפי תורם</h3>
            <div style={{ height: 200, position: 'relative' }}>
              <canvas ref={doughnutRef} />
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {top6.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ color: '#6c2d45', fontWeight: 600 }}>{fmt(d.donations2026)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ color: '#6c2d45', margin: '0 0 16px', fontSize: 15 }}>תרומות לפי חודש 2026</h3>
            <div style={{ height: 280, position: 'relative' }}>
              <canvas ref={barRef} />
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Top donors */}
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ color: '#6c2d45', margin: '0 0 16px', fontSize: 15 }}>תורמים מובילים Top 10</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topDonors.map((d, i) => (
                <div key={d.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#d4af37', fontWeight: 700, minWidth: 18, fontSize: 14 }}>{i + 1}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{d.name}</span>
                    </div>
                    <span style={{ color: '#6c2d45', fontWeight: 600 }}>{fmt(d.totalDonations)}</span>
                  </div>
                  <div style={{ background: '#f0e8ec', borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${(d.totalDonations / maxDonation) * 100}%`, height: '100%', background: '#6c2d45', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Annual comparison */}
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ color: '#6c2d45', margin: '0 0 16px', fontSize: 15 }}>השוואה שנתית</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {([
                { label: 'תרומות 2025', value: donations2025, color: '#6c2d45' },
                { label: 'תרומות 2026', value: donations2026, color: '#9b4e6a' },
                { label: 'התחייבויות 2025', value: commitments2025, color: '#d4af37' },
                { label: 'התחייבויות 2026', value: commitments2026, color: '#b8a040' },
              ] as const).map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 600, color }}>{fmt(value)}</span>
                  </div>
                  <div style={{ background: '#f5f0f2', borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${(value / maxYear) * 100}%`, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                { label: 'יתרה 2025', value: balance2025 },
                { label: 'יתרה 2026', value: balance2026 },
              ] as const).map(({ label, value }) => (
                <div key={label} style={{ background: '#f7f3f5', borderRadius: 8, padding: '12px 14px', border: '1px solid #e0d0d8' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: value > 0 ? '#c0392b' : '#27ae60', fontSize: 16 }}>{fmt(value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
