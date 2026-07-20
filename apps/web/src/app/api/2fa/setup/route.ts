import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { encryptField } from '@/lib/crypto';
import { generateSecret, otpauthUri } from '@/lib/totp';

/**
 * POST /api/2fa/setup
 *
 * Starts the enrollment flow. Generates a fresh TOTP secret, stores it encrypted,
 * and returns the otpauth:// URI (for QR codes) plus the plain secret (for
 * manual entry). Enrollment is NOT complete until /api/2fa/verify succeeds.
 *
 * The stored secret has totpEnabledAt = null until verify succeeds.
 */
export async function POST() {
  try {
    const user = await requireAuth();

    // Refuse to re-issue if user is already enrolled.
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpEnabledAt: true, email: true },
    });
    if (existing?.totpEnabledAt) {
      return NextResponse.json(
        { error: 'Already enrolled. Disable existing 2FA before re-enrolling.' },
        { status: 400 },
      );
    }

    const secret = generateSecret();
    const encryptedSecret = encryptField(secret);
    const uri = otpauthUri(secret, existing?.email ?? user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecretEncrypted: encryptedSecret,
        // totpEnabledAt intentionally NOT set — enrollment finishes on verify
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: '2fa.setup_started',
        resourceType: 'User',
        resourceId: user.id,
      },
    });

    return NextResponse.json({
      secret, // display for manual entry
      otpauthUri: uri,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
