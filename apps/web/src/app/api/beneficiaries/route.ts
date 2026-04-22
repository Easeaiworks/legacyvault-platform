import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const beneficiaries = await prisma.beneficiary.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      include: {
        asset: { select: { id: true, nickname: true, category: true, type: true } },
        person: { select: { id: true, firstName: true, lastName: true, relationship: true } },
      },
      orderBy: [{ assetId: 'asc' }, { designation: 'asc' }],
    });
    return NextResponse.json(beneficiaries);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
