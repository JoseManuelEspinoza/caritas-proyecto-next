import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'

const protectedRoutes = ['/dashboard']
const authRoutes = ['/login', '/registro', '/recuperar']

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  const isProtected = protectedRoutes.some((r) => path.startsWith(r))
  const isAuthRoute = authRoutes.some((r) => path.startsWith(r))

  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)
  const isAuthenticated = Boolean(session?.userId)

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
