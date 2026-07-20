import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { decryptField } from '@/lib/crypto';
import { verifyCode, matchBackupCode } from '@/lib/totp';

/**
 * POST /api/2fa/disable
 * Body: { code: string } — either a live 6-digit TOTP or a backup code.
 *
 * Requires re-proof of possession before disabling, to prevent a hijacked
 * session from silently removing 2FA.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        totpSecretEncrypted: true,
        totpEnabledAt: true,
        totpBackupCodesHashed: true,
      },
    });

    if (!u?.totpEnabledAt || !u.totpSecretEncrypted) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    let ok = false;
    if (/^\d{6}$/.test(code)) {
      const secret = decryptField(u.totpSecretEncrypted);
      ok = verifyCode(secret, code);
    } else if (/^[0-9a-f]{10}$/i.test(code)) {
      ok = matchBackupCode(u.totpBackupCodesHashed, code) !== null;
    }

    if (!ok) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          event: '2fa.disable_failed',
          resourceType: 'User',
          resourceId: user.id,
        },
      });
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecretEncrypted: null,
        totpEnabledAt: null,
        totpBackupCodesHashed: [],
        mfaEnforced: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: '2fa.disabled',
        resourceType: 'User',
        resourceId: user.id,
      },
    });

    return NextResponse.json({ disabled: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
