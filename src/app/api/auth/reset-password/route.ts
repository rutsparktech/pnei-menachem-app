import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { username?: string; new_password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { username, new_password } = body
  if (!username || !new_password) {
    return NextResponse.json({ error: 'Missing username or new_password' }, { status: 400 })
  }

  const hash = await bcrypt.hash(new_password, 12)

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { error } = await supabase
    .from('app_users')
    .update({ password_hash: hash })
    .eq('username', username)

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
