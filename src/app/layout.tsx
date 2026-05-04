import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
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
      <body className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <main className="flex-1 pt-16 pb-20 overflow-y-auto">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
