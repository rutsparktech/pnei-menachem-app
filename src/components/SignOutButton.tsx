'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-xs text-muted hover:text-primary transition-colors px-2 py-1 rounded"
    >
      יציאה
    </button>
  )
}
