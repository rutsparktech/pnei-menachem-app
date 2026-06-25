import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

export const metadata = { title: 'כניסה · פני מנחם' }

async function loginAction(formData: FormData) {
  'use server'
  try {
    await signIn('credentials', {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      redirectTo: '/donors',
    })
  } catch (err) {
    // next/navigation redirect() throws — re-throw it so it propagates
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    if (err instanceof AuthError) redirect('/login?error=1')
    throw err
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">פ</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">פני מנחם</h1>
          <p className="text-sm text-muted mt-1">כניסה למערכת ניהול התורמים</p>
        </div>

        <form
          action={loginAction}
          className="bg-surface border border-border rounded-[--radius-card] p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 text-center font-medium">
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
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
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
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98] mt-2"
          >
            כניסה
          </button>
        </form>
      </div>
    </div>
  )
}
