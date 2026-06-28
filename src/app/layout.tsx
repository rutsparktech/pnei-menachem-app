import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import TopHeader from '@/components/TopHeader'

const heebo = Heebo({
  variable: '--font-heebo',
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'פני מנחם - ניהול תורמים',
  description: 'מערכת ניהול תורמים לקרן פני מנחם',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body
        className="min-h-screen flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #2d1520 0%, #1a0c14 50%, #221508 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <TopHeader />
        <main className="flex-1 pt-16 pb-20 overflow-y-auto">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
        <Suspense fallback={null}><BottomNav /></Suspense>
      </body>
    </html>
  )
}
