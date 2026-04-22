import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js middleware — gates /app/* and /onboarding/* routes.
 *
 * In WorkOS mode the API sets an HttpOnly `lv_session` cookie on the
 * same eTLD+1, which we check for presence here. Full verification happens
 * in the API on every request — this middleware only does a short-circuit
 * redirect for unauthenticated users to avoid flashing the dashboard.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPaths = ['/app'];

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const cookie = req.cookies.get('lv_session');
  // In local-dev fallback we store the token in localStorage on the client,
  // so the server-side cookie won't be present — let the client-side AuthGate
  // handle the redirect. This middleware is a best-effort short-circuit
  // for the WorkOS mode.
  const authMode = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'local';
  if (authMode === 'local') return NextResponse.next();

  if (!cookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
