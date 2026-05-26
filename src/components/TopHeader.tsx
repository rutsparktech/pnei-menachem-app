import Link from 'next/link'
import Image from 'next/image'

export default function TopHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-primary shadow-md flex items-center px-4">
      <Link href="/" className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Image src="/emblem.png" alt="פני מנחם" width={26} height={24} priority />
        </span>
        <div className="leading-tight">
          <p className="text-white font-bold text-base leading-none">פני מנחם</p>
          <p className="text-accent text-xs font-medium mt-0.5">ניהול תורמים</p>
        </div>
      </Link>
    </header>
  )
}
