import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

function signSession(value: string): string {
  const secret = process.env.SESSION_SECRET!
  const sig = createHmac('sha256', secret).update(value).digest('hex')
  return `${value}.${sig}`
}

export async function POST(req: NextRequest) {
  const secret = process.env.SESSION_SECRET
  const appPassword = process.env.APP_PASSWORD

  if (!secret || !appPassword) {
    console.error('SESSION_SECRET or APP_PASSWORD not configured')
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }

  let password: string
  try {
    const body = await req.json()
    password = body?.password
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  if (!password || password !== appPassword) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
  }

  const token = signSession('auth')
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
