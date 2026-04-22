import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const persons = await prisma.person.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      // Omit encrypted fields from list view.
      select: {
        id: true,
        firstName: true,
        lastName: true,
        relationship: true,
        email: true,
        createdAt: true,
      },
    });
    return NextResponse.json(persons);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
