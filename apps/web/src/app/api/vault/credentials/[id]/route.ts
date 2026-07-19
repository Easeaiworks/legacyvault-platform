import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/vault/credentials/:id
 * Update a credential's label, provider, intended action, or replace its
 * ciphertext (e.g., after user rotates a password). Same plaintext-refusal
 * defense as POST.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'No principal' }, { status: 400 });
    const { id } = await ctx.params;

    const existing = await prisma.credentialEntry.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    for (const forbidden of ['password', 'passwordPlain', 'username', 'notes', 'answer']) {
      if (forbidden in body) {
        return NextResponse.json(
          { error: `Refusing plaintext field "${forbidden}".` },
          { status: 400 },
        );
      }
    }

    const {
      label,
      provider,
      ciphertextBase64,
      ivBase64,
      intendedAction,
      linkedDigitalAssetId,
    } = body as {
      label?: string;
      provider?: string | null;
      ciphertextBase64?: string;
      ivBase64?: string;
      intendedAction?: string;
      linkedDigitalAssetId?: string | null;
    };

    const VALID_ACTIONS = [
      'CANCEL',
      'TRANSFER',
      'MEMORIALIZE',
      'DELETE',
      'PRESERVE',
      'UNCERTAIN',
    ] as const;
    type Action = (typeof VALID_ACTIONS)[number];
    const validatedAction: Action | undefined =
      intendedAction !== undefined && VALID_ACTIONS.includes(intendedAction as Action)
        ? (intendedAction as Action)
        : undefined;

    const updated = await prisma.credentialEntry.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(ciphertextBase64 !== undefined ? { ciphertextBase64 } : {}),
        ...(ivBase64 !== undefined ? { ivBase64 } : {}),
        ...(validatedAction !== undefined ? { intendedAction: validatedAction } : {}),
        ...(linkedDigitalAssetId !== undefined ? { linkedDigitalAssetId } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'credential.updated',
        resourceType: 'CredentialEntry',
        resourceId: id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** DELETE /api/vault/credentials/:id — soft-delete. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'No principal' }, { status: 400 });
    const { id } = await ctx.params;

    const existing = await prisma.credentialEntry.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.credentialEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'credential.deleted',
        resourceType: 'CredentialEntry',
        resourceId: id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
