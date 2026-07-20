import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production-must-be-long';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

/**
 * View-only vault access (§2.C.2).
 *
 * A "viewer" is a User in the member's tenant holding only the VAULT_VIEWER
 * role. Write access is blocked centrally in middleware for such tokens.
 *
 * Until the production auth provider (WorkOS) is wired up, access is granted
 * by a signed 7-day link the member copies and shares themselves — the same
 * trust model as sharing a document link. When real auth lands, this becomes
 * an emailed magic-link invite.
 */

/** GET /api/viewers — list this tenant's view-only accounts. Owner only. */
export async function GET() {
  try {
    const user = await requireRole(['VAULT_OWNER', 'PLATFORM_ADMIN']);

    const viewers = await prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        authProvider: 'local-viewer',
        roles: { some: { role: 'VAULT_VIEWER' } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ viewers });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** POST /api/viewers { email, firstName, lastName } — create viewer + access link. Owner only. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['VAULT_OWNER', 'PLATFORM_ADMIN']);

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { tenantId: user.tenantId, email },
      include: { roles: true },
    });
    if (existing && existing.roles.some((r) => r.role !== 'VAULT_VIEWER')) {
      return NextResponse.json(
        { error: 'That email already belongs to a non-viewer account' },
        { status: 409 },
      );
    }

    const viewer =
      existing ??
      (await prisma.user.create({
        data: {
          tenantId: user.tenantId,
          authProviderId: `viewer:${crypto.randomUUID()}`,
          authProvider: 'local-viewer',
          email,
          firstName,
          lastName,
          roles: { create: [{ role: 'VAULT_VIEWER' }] },
        },
      }));

    // 7-day view-only token. Middleware blocks all write methods for it.
    const token = await new SignJWT({
      sub: viewer.id,
      tenantId: viewer.tenantId,
      roles: ['VAULT_VIEWER'],
      email: viewer.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretBytes);

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: existing ? 'viewer.link_reissued' : 'viewer.created',
        resourceType: 'User',
        resourceId: viewer.id,
        afterJson: { email: viewer.email },
      },
    });

    const origin = req.nextUrl.origin;
    return NextResponse.json(
      {
        id: viewer.id,
        email: viewer.email,
        accessLink: `${origin}/viewer-access#${token}`,
        expiresInDays: 7,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
