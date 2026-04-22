import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const instructions = await prisma.instruction.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      // Never return bodies in list views.
      select: {
        id: true,
        category: true,
        title: true,
        recipientPersonId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(instructions);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
