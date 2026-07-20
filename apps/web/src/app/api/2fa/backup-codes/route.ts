import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { decryptField } from '@/lib/crypto';
import { verifyCode, generateBackupCodes } from '@/lib/totp';

/**
 * POST /api/2fa/backup-codes
 * Body: { code: string }  (a live TOTP code)
 *
 * Rotates backup codes. Old backup codes are invalidated; returns 10 new
 * plaintext codes that the user MUST record — we hash them immediately.
 * Requires a fresh TOTP code to prevent lost-session hijack.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = body.code?.trim();

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'code (6 digits) required' }, { status: 400 });
    }

    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecretEncrypted: true, totpEnabledAt: true },
    });

    if (!u?.totpEnabledAt || !u.totpSecretEncrypted) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    const secret = decryptField(u.totpSecretEncrypted);
    if (!verifyCode(secret, code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const { plain, hashed } = generateBackupCodes(10);
    await prisma.user.update({
      where: { id: user.id },
      data: { totpBackupCodesHashed: hashed },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: '2fa.backup_codes_rotated',
        resourceType: 'User',
        resourceId: user.id,
      },
    });

    return NextResponse.json({ backupCodes: plain });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
