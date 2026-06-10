import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const PUBLIC = ['/login', '/api/auth/', '/api/webhook/monday']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('session')?.value
  const valid = token ? await verifySession(token) : null

  if (!valid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'אינך מחובר' }, { status: 401 })
    }
    const url = new URL('/login', req.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)'],
}
