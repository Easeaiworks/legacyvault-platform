import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

/**
 * POST /api/auth/demo/login
 *
 * Issues a JWT for the seeded demo user (Ada Lovelace). Gated on DEMO_MODE
 * env var so production deployments can't accidentally expose it.
 */
export async function POST() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo mode is disabled on this environment.' },
      { status: 401 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { email: 'demo@legacyvault.app' },
    include: { roles: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Demo user not seeded.', hint: 'Re-run the demo seed.' },
      { status: 500 },
    );
  }

  const token = await signToken({
    id: user.id,
    tenantId: user.tenantId,
    roles: user.roles.map((r) => r.role),
    email: user.email,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
}
