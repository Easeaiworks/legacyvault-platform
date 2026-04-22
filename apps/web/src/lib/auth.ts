// Lightweight JWT auth for the Next.js API routes.
// Uses `jose` instead of `jsonwebtoken` because jose works in both
// Node and edge runtimes — we default to Node but want the option.

import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production-must-be-long';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

export interface AuthUser {
  id: string;
  tenantId: string;
  roles: string[];
  email: string;
}

/** Sign a JWT for a given user + their roles + tenant. */
export async function signToken(user: {
  id: string;
  tenantId: string;
  roles: string[];
  email: string;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    tenantId: user.tenantId,
    roles: user.roles,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretBytes);
}

/** Resolve the current user from either the Authorization header or lv_session cookie. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const headersList = await headers();
  const cookieStore = await cookies();

  const authHeader = headersList.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = cookieStore.get('lv_session')?.value;
  const token = bearer ?? cookieToken;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretBytes);
    return {
      id: String(payload.sub),
      tenantId: String(payload.tenantId),
      roles: (payload.roles as string[]) ?? [],
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

/** Helper that throws a 401 if not authenticated. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return user;
}

/** Finds the Principal owned by the current user's tenant. Single-principal per tenant for consumer plans. */
export async function getCurrentPrincipal(tenantId: string) {
  return prisma.principal.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
}
