import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

/**
 * GET /api/vault/config
 * Returns the current principal's VaultConfig, or null if the vault has not
 * been initialized. The client uses this to decide between showing the setup
 * wizard vs. the unlock prompt.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json(null);
    const cfg = await prisma.vaultConfig.findUnique({
      where: { principalId: principal.id },
    });
    return NextResponse.json(cfg);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * POST /api/vault/config
 * First-time vault setup. Accepts the client-generated KDF config + wrapped VMK.
 * Server never sees vault password or recovery code — only ciphertext + salt.
 *
 * Body: {
 *   kdfAlgorithm, kdfIterations, kdfSaltBase64,
 *   vmkWrappedByPasswordBase64, vmkWrappedByPasswordIvBase64,
 *   vmkWrappedByRecoveryBase64, vmkWrappedByRecoveryIvBase64,
 *   recoveryCodeHint?
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({ error: 'No principal' }, { status: 400 });
    }

    // If a config already exists, refuse — resetting a vault is a separate flow.
    const existing = await prisma.vaultConfig.findUnique({
      where: { principalId: principal.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Vault already initialized. Use the reset flow.' },
        { status: 409 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      kdfAlgorithm?: string;
      kdfIterations?: number;
      kdfSaltBase64?: string;
      vmkWrappedByPasswordBase64?: string;
      vmkWrappedByPasswordIvBase64?: string;
      vmkWrappedByRecoveryBase64?: string;
      vmkWrappedByRecoveryIvBase64?: string;
      recoveryCodeHint?: string;
    };

    const required = [
      'kdfSaltBase64',
      'vmkWrappedByPasswordBase64',
      'vmkWrappedByPasswordIvBase64',
      'vmkWrappedByRecoveryBase64',
      'vmkWrappedByRecoveryIvBase64',
    ] as const;
    for (const k of required) {
      if (!body[k]) {
        return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
      }
    }

    const cfg = await prisma.vaultConfig.create({
      data: {
        principalId: principal.id,
        kdfAlgorithm: body.kdfAlgorithm ?? 'PBKDF2-SHA256',
        kdfIterations: body.kdfIterations ?? 600000,
        kdfSaltBase64: body.kdfSaltBase64!,
        vmkWrappedByPasswordBase64: body.vmkWrappedByPasswordBase64!,
        vmkWrappedByPasswordIvBase64: body.vmkWrappedByPasswordIvBase64!,
        vmkWrappedByRecoveryBase64: body.vmkWrappedByRecoveryBase64!,
        vmkWrappedByRecoveryIvBase64: body.vmkWrappedByRecoveryIvBase64!,
        recoveryCodeHint: body.recoveryCodeHint ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'vault.initialized',
        resourceType: 'VaultConfig',
        resourceId: principal.id,
      },
    });

    return NextResponse.json(cfg, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * DELETE /api/vault/config
 * Destroy the vault entirely — wipes VaultConfig AND all CredentialEntries.
 * User must have separately confirmed on the client.
 */
export async function DELETE() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'No principal' }, { status: 400 });

    await prisma.$transaction([
      prisma.credentialEntry.deleteMany({ where: { principalId: principal.id } }),
      prisma.vaultConfig.deleteMany({ where: { principalId: principal.id } }),
    ]);

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'vault.destroyed',
        resourceType: 'VaultConfig',
        resourceId: principal.id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
