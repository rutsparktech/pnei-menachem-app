import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const secret = process.env.NEXTAUTH_SECRET

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: 'missing env vars',
      SUPABASE_URL: url ? '✅' : '❌ MISSING',
      SUPABASE_SERVICE_ROLE_KEY: key ? '✅' : '❌ MISSING',
      NEXTAUTH_SECRET: secret ? '✅' : '❌ MISSING',
    })
  }

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await sb
      .from('app_users')
      .select('username, display_name')
      .limit(5)

    return NextResponse.json({
      ok: !error,
      SUPABASE_URL: '✅',
      SUPABASE_SERVICE_ROLE_KEY: '✅',
      NEXTAUTH_SECRET: secret ? '✅' : '❌ MISSING',
      supabase_error: error ? `${error.code}: ${error.message}` : null,
      users_found: data?.length ?? 0,
      users: data?.map((u) => u.username) ?? [],
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      exception: e instanceof Error ? e.message : String(e),
    })
  }
}
