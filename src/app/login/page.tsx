import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import Image from 'next/image'
import LoginForm from '@/components/LoginForm'

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
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-5 shadow-2xl">
            <Image src="/emblem.png" alt="פני מנחם" width={68} height={64} priority />
          </div>
          <h1 className="text-2xl font-bold text-white">פני מנחם</h1>
          <p className="text-sm text-white/60 mt-1">כניסה למערכת ניהול התורמים</p>
        </div>

        <LoginForm action={loginAction} error={!!error} />
      </div>
    </div>
  )
}
