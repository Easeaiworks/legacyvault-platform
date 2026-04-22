import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const contacts = await prisma.trustedContact.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, email: true, relationship: true },
        },
        accessGrants: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return NextResponse.json(contacts);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
