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
          if (!credentials?.username || !credentials?.password) return null

          const TABLE = 'app_users'

          const { data, error } = await supabase()
            .from(TABLE)
            .select('id, display_name, email, password_hash')
            .eq('username', credentials.username as string)
            .single()

          console.log('[auth-debug] supabase user lookup', {
            resolvedUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
            table: TABLE,
            errorCode: error?.code,
            errorMessage: error?.message,
            errorDetails: (error as any)?.details,
            errorHint: (error as any)?.hint,
            gotUser: !!data,
          })

          if (error || !data) return null

          const valid = await bcrypt.compare(credentials.password as string, data.password_hash)
          if (!valid) return null

          return { id: data.id, name: data.display_name, email: data.email }
        } catch (e) {
          console.error('[auth-debug] EXCEPTION', e instanceof Error ? e.message : String(e))
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
})
