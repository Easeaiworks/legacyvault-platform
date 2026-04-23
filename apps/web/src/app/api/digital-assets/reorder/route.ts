import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

/**
 * POST /api/digital-assets/reorder
 * Bulk update priorityOrder for a set of digital assets.
 * Body: { order: [{ id, priorityOrder }] }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      order?: { id: string; priorityOrder: number }[];
    };

    if (!Array.isArray(body.order) || body.order.length === 0) {
      return NextResponse.json({ error: 'order[] required' }, { status: 400 });
    }

    // Ensure every id belongs to the current principal before doing the writes
    const ids = body.order.map((o) => o.id);
    const owned = await prisma.digitalAsset.findMany({
      where: {
        id: { in: ids },
        tenantId: user.tenantId,
        principalId: principal.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((a) => a.id));
    if (ownedSet.size !== ids.length) {
      return NextResponse.json(
        { error: 'One or more ids are not owned by this principal' },
        { status: 403 },
      );
    }

    await prisma.$transaction(
      body.order.map((o) =>
        prisma.digitalAsset.update({
          where: { id: o.id },
          data: { priorityOrder: o.priorityOrder },
        }),
      ),
    );

    return NextResponse.json({ updated: body.order.length });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
