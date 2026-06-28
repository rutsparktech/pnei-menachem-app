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
            'radial-gradient(ellipse 120% 55% at 50% -5%, rgba(212,175,55,0.22) 0%, transparent 55%), ' +
            'linear-gradient(165deg, #4d1e32 0%, #3a1525 30%, #251018 60%, #3a2010 100%)',
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
