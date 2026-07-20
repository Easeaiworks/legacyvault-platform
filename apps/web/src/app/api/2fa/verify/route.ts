import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { decryptField } from '@/lib/crypto';
import { verifyCode, generateBackupCodes } from '@/lib/totp';

/**
 * POST /api/2fa/verify
 * Body: { code: string }
 *
 * Verifies a 6-digit TOTP code. If it matches:
 *   - Sets totpEnabledAt = now (completing enrollment)
 *   - Generates and stores 10 hashed backup codes
 *   - Returns the plaintext backup codes (only shown once to the user)
 *
 * If the user was already enrolled, this endpoint is idempotent — it does not
 * regenerate backup codes on subsequent verify calls.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = body.code?.trim();

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'code must be 6 digits' }, { status: 400 });
    }

    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecretEncrypted: true, totpEnabledAt: true },
    });

    if (!u?.totpSecretEncrypted) {
      return NextResponse.json(
        { error: 'No TOTP setup in progress. POST /api/2fa/setup first.' },
        { status: 400 },
      );
    }

    const secret = decryptField(u.totpSecretEncrypted);
    if (!verifyCode(secret, code)) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          event: '2fa.verify_failed',
          resourceType: 'User',
          resourceId: user.id,
        },
      });
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // If not yet enrolled, complete enrollment: set enabled + issue backup codes.
    if (!u.totpEnabledAt) {
      const { plain, hashed } = generateBackupCodes(10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          totpEnabledAt: new Date(),
          totpBackupCodesHashed: hashed,
          mfaEnforced: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          event: '2fa.enrolled',
          resourceType: 'User',
          resourceId: user.id,
        },
      });

      return NextResponse.json({
        enrolled: true,
        backupCodes: plain,
      });
    }

    // Already enrolled — just confirm the code works.
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: '2fa.verify_success',
        resourceType: 'User',
        resourceId: user.id,
      },
    });
    return NextResponse.json({ verified: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
