import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

function supabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(credentials) {
        try {
          console.error('[auth] authorize called, username:', credentials?.username ?? 'EMPTY')

          if (!credentials?.username || !credentials?.password) {
            console.error('[auth] missing credentials')
            return null
          }

          const { data: user, error } = await supabase()
            .from('app_users')
            .select('id, display_name, email, password_hash')
            .eq('username', credentials.username as string)
            .single()

          if (error) {
            console.error('[auth] supabase error:', error.code, error.message)
            return null
          }
          if (!user) {
            console.error('[auth] user not found')
            return null
          }

          console.error('[auth] user found:', user.display_name, '| hash prefix:', user.password_hash?.slice(0, 10))

          const valid = await bcrypt.compare(credentials.password as string, user.password_hash)
          console.error('[auth] bcrypt result:', valid)

          if (!valid) return null
          return { id: user.id, name: user.display_name, email: user.email }
        } catch (e) {
          console.error('[auth] EXCEPTION:', e instanceof Error ? e.message : String(e))
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
})
