import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

const VALID_KINDS = [
  'LOGIN',
  'SECURITY_ANSWER',
  'RECOVERY_CODE',
  'SEED_PHRASE',
  'TOTP_SEED',
  'OTHER',
] as const;
type Kind = (typeof VALID_KINDS)[number];

/** GET /api/vault/credentials — list credential metadata + ciphertext. */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json([]);
    const list = await prisma.credentialEntry.findMany({
      where: { tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
      orderBy: [{ label: 'asc' }],
    });
    return NextResponse.json(list);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * POST /api/vault/credentials
 * Add a new credential. Body must include `ciphertextBase64` and `ivBase64`
 * (client-side encrypted). We refuse any body containing plaintext credential
 * fields — this is a defense in depth against accidental exposure.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'No principal' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Defense in depth: refuse any obvious plaintext credential fields
    for (const forbidden of ['password', 'passwordPlain', 'username', 'notes', 'answer']) {
      if (forbidden in body) {
        return NextResponse.json(
          { error: `Refusing plaintext field "${forbidden}" — encrypt on client and send ciphertextBase64.` },
          { status: 400 },
        );
      }
    }

    const {
      kind,
      label,
      provider,
      ciphertextBase64,
      ivBase64,
      intendedAction,
      linkedDigitalAssetId,
    } = body as {
      kind?: string;
      label?: string;
      provider?: string;
      ciphertextBase64?: string;
      ivBase64?: string;
      intendedAction?: string;
      linkedDigitalAssetId?: string;
    };

    if (!label || !ciphertextBase64 || !ivBase64) {
      return NextResponse.json(
        { error: 'label, ciphertextBase64, ivBase64 are required' },
        { status: 400 },
      );
    }
    if (kind && !VALID_KINDS.includes(kind as Kind)) {
      return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
    }

    const entry = await prisma.credentialEntry.create({
      data: {
        tenantId: user.tenantId,
        principalId: principal.id,
        kind: (kind as Kind) ?? 'LOGIN',
        label,
        provider: provider ?? null,
        ciphertextBase64,
        ivBase64,
        intendedAction: (intendedAction as never) ?? 'UNCERTAIN',
        linkedDigitalAssetId: linkedDigitalAssetId ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'credential.created',
        resourceType: 'CredentialEntry',
        resourceId: entry.id,
        afterJson: { label: entry.label, kind: entry.kind },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
