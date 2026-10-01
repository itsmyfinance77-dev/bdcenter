import { NextResponse, type NextRequest } from 'next/server';
import {
  MEMBER_COOKIE,
  SESSION_COOKIE,
  verifySession,
  type SessionAudience,
} from '@/modules/auth/session-token';

/**
 * First line of defense for /admin and the member area /account: no validly
 * signed session cookie of the right kind, no page. Pages and server actions
 * still call `requireAdmin()` / `requireMember()` themselves, which also
 * re-check the account is active and the session has not been revoked.
 */
const areas: { prefix: string; login: string; cookie: string; aud: SessionAudience }[] = [
  { prefix: '/admin', login: '/admin/login', cookie: SESSION_COOKIE, aud: 'admin' },
  { prefix: '/account', login: '/account/login', cookie: MEMBER_COOKIE, aud: 'member' },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = areas.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  // The login pages themselves (including the admin second step) are public.
  if (!area || pathname === area.login || pathname.startsWith(`${area.login}/`)) {
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(area.cookie)?.value, area.aud);
  if (session) return NextResponse.next();

  const login = new URL(area.login, request.url);
  if (pathname !== area.prefix) login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/admin', '/admin/:path*', '/account', '/account/:path*'] };
