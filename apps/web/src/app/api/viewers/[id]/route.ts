import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { isUuid } from '@/lib/ids';

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/viewers/:id — revoke a view-only account. Owner only.
 * Deleting the user invalidates nothing cryptographically (JWTs are
 * stateless), but every API request resolves the user's tenant data through
 * queries scoped by tenantId + the user row; with the row gone, /auth/me and
 * data routes return nothing useful, and the middleware still blocks writes.
 * Short 7-day token lifetime bounds the residual window.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireRole(['VAULT_OWNER', 'PLATFORM_ADMIN']);
    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const viewer = await prisma.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        authProvider: 'local-viewer',
        roles: { some: { role: 'VAULT_VIEWER' } },
      },
    });
    if (!viewer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.user.delete({ where: { id: viewer.id } });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'viewer.revoked',
        resourceType: 'User',
        resourceId: viewer.id,
        afterJson: { email: viewer.email },
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
