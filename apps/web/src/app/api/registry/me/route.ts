import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: { registryEntry: true },
    });
    if (!principal) return NextResponse.json({ status: 'no-principal', entry: null });
    if (!principal.registryEntry) return NextResponse.json({ status: 'not-opted-in', entry: null });
    if (principal.registryEntry.optedOutAt)
      return NextResponse.json({ status: 'opted-out', entry: null });
    return NextResponse.json({ status: 'active', entry: principal.registryEntry });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
