import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/modules/auth/session-token';

/**
 * First line of defense for /admin: no valid session cookie, no admin page.
 * Pages and server actions still call `requireAdmin()` themselves, which also
 * re-checks that the account is active and has the right role.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const login = new URL('/admin/login', request.url);
  if (pathname !== '/admin') login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
