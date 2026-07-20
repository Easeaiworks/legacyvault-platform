import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production-must-be-long';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Next.js middleware.
 *
 * 1. Gates /app/* routes (WorkOS mode only — local mode defers to AuthGate).
 * 2. Enforces read-only access for VAULT_VIEWER tokens: any write-method
 *    /api request carrying a JWT whose roles include VAULT_VIEWER but not
 *    VAULT_OWNER is rejected with 403 here, at a single choke point, so no
 *    individual route handler can forget the check. Requests without a JWT
 *    (public endpoints like death-verifications, worker-token endpoints)
 *    are unaffected — their own handlers keep their own auth.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (!WRITE_METHODS.has(req.method)) return NextResponse.next();

    const authHeader = req.headers.get('authorization') ?? '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearer ?? req.cookies.get('lv_session')?.value ?? null;
    if (!token) return NextResponse.next();

    try {
      const { payload } = await jwtVerify(token, secretBytes);
      const roles = (payload.roles as string[]) ?? [];
      if (roles.includes('VAULT_VIEWER') && !roles.includes('VAULT_OWNER')) {
        return NextResponse.json(
          { error: 'View-only access: this account cannot make changes' },
          { status: 403 },
        );
      }
    } catch {
      // Invalid/expired token — let the route's own auth produce the 401.
    }
    return NextResponse.next();
  }

  const isProtected = pathname === '/app' || pathname.startsWith('/app/');
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
  matcher: ['/app/:path*', '/api/:path*'],
};
