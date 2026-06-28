'use client'

import { useFormStatus } from 'react-dom'
import Image from 'next/image'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <>
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse 120% 55% at 50% -5%, rgba(212,175,55,0.22) 0%, transparent 55%), linear-gradient(165deg, #4d1e32 0%, #3a1525 30%, #251018 60%, #3a2010 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div
                className="absolute -inset-6 rounded-full animate-ping"
                style={{ background: 'rgba(212, 175, 55, 0.25)', animationDuration: '1.5s' }}
              />
              <div className="relative w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-2xl luxury-entrance">
                <Image src="/emblem.png" alt="פני מנחם" width={72} height={68} priority />
              </div>
            </div>
            <p className="text-white/80 text-sm font-medium tracking-wide">מתחבר...</p>
          </div>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-hover transition-colors active:scale-[0.98] mt-2 disabled:opacity-70 shadow-lg text-base tracking-wide"
      >
        {pending ? 'מתחבר...' : 'כניסה למערכת'}
      </button>
    </>
  )
}

export default function LoginForm({
  action,
  error,
}: {
  action: (formData: FormData) => void
  error: boolean
}) {
  return (
    <form
      action={action}
      className="bg-white rounded-[--radius-card] p-7 space-y-5 shadow-2xl"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center font-medium">
          שם משתמש או סיסמה שגויים
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="username" className="text-sm font-semibold text-text">
          שם משתמש
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          dir="ltr"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-text">
          סיסמה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <SubmitButton />
    </form>
  )
}
