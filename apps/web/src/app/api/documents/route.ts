import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const docs = await prisma.document.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      select: {
        id: true,
        title: true,
        category: true,
        sizeBytes: true,
        mimeType: true,
        documentDate: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(
      docs.map((d) => ({ ...d, sizeBytes: d.sizeBytes.toString() })),
    );
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
