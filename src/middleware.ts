import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const loggedIn = !!req.auth
  const { pathname } = req.nextUrl

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/warmup') ||
    pathname.startsWith('/api/webhook')
  ) {
    return NextResponse.next()
  }

  if (!loggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|ico|svg)$).*)'],
}
