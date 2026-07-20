import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/** GET /api/2fa/status — is 2FA enrolled? how many backup codes left? */
export async function GET() {
  try {
    const user = await requireAuth();
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        totpEnabledAt: true,
        totpBackupCodesHashed: true,
        mfaEnforced: true,
      },
    });
    return NextResponse.json({
      enabled: Boolean(u?.totpEnabledAt),
      enabledAt: u?.totpEnabledAt ?? null,
      backupCodesRemaining: u?.totpBackupCodesHashed.length ?? 0,
      mfaEnforced: Boolean(u?.mfaEnforced),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
