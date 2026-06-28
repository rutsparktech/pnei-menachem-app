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
          background:
            'radial-gradient(ellipse 160% 70% at 50% 0%, rgba(212,175,55,0.45) 0%, rgba(212,175,55,0) 55%), ' +
            'radial-gradient(ellipse 80% 50% at 100% 100%, rgba(108,45,69,0.5) 0%, transparent 55%), ' +
            'linear-gradient(160deg, #6c2d45 0%, #4d1e32 30%, #3a1520 65%, #4d2e10 100%)',
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
