import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const secret = process.env.NEXTAUTH_SECRET

  const result: Record<string, unknown> = {
    SUPABASE_URL: url ? `✅ ${url.slice(0, 30)}...` : '❌ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: key ? `✅ starts with: ${key.slice(0, 6)}...` : '❌ MISSING',
    NEXTAUTH_SECRET: secret ? '✅' : '❌ MISSING',
  }

  if (!url || !key) return NextResponse.json(result)

  const sb = createClient(url, key, { auth: { persistSession: false } })

  // Test: does 'users' table exist?
  const r1 = await sb.from('users').select('count').limit(1)
  result['table_users'] = r1.error
    ? `❌ ${r1.error.code}: ${r1.error.message}`
    : `✅ exists`

  // Test: does 'app_users' table exist?
  const r2 = await sb.from('app_users').select('count').limit(1)
  result['table_app_users'] = r2.error
    ? `❌ ${r2.error.code}: ${r2.error.message}`
    : `✅ exists`

  return NextResponse.json(result)
}
