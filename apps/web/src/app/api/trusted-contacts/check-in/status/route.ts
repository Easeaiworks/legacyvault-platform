import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const CHECK_IN_INTERVAL_DAYS = 90;

export async function GET() {
  try {
    const user = await requireAuth();
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastCheckInAt: true },
    });
    const lastCheckIn = u?.lastCheckInAt ?? null;
    const nextDue = lastCheckIn
      ? new Date(lastCheckIn.getTime() + CHECK_IN_INTERVAL_DAYS * 86_400_000)
      : null;
    const daysRemaining = nextDue
      ? Math.max(0, Math.ceil((nextDue.getTime() - Date.now()) / 86_400_000))
      : CHECK_IN_INTERVAL_DAYS;

    return NextResponse.json({
      lastCheckInAt: lastCheckIn,
      nextDueAt: nextDue,
      daysUntilDue: daysRemaining,
      status:
        daysRemaining > 30 ? 'healthy' : daysRemaining > 0 ? 'due-soon' : 'overdue',
      pendingGrants: [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
