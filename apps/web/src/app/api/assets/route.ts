import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const assets = await prisma.asset.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      orderBy: [{ category: 'asc' }, { nickname: 'asc' }],
    });

    // Serialize BigInt fields to strings for JSON transport.
    return NextResponse.json(
      assets.map((a) => ({
        ...a,
        estimatedValueCents: a.estimatedValueCents?.toString() ?? null,
      })),
    );
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
