import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

/**
 * POST /api/auth/login/start  { email }
 *
 * In the demo environment we don't have a real auth provider wired up, so
 * we fall back to: if DEMO_MODE=true, issue a token for the seeded demo
 * user regardless of the email supplied. This lets the /register and /login
 * screens complete a happy-path visit for the lawyer demo.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  if (!body.email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  if (process.env.DEMO_MODE === 'true') {
    const user = await prisma.user.findFirst({
      where: { email: 'demo@legacyvault.app' },
      include: { roles: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Demo user not seeded' }, { status: 500 });
    }
    const token = await signToken({
      id: user.id,
      tenantId: user.tenantId,
      roles: user.roles.map((r) => r.role),
      email: user.email,
    });
    return NextResponse.json({ devToken: token });
  }

  return NextResponse.json(
    {
      error:
        'Authentication provider is not configured on this environment. Visit /demo to sign in as the demo user.',
    },
    { status: 501 },
  );
}
