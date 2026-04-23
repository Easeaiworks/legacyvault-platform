import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

type DigitalAssetAction =
  | 'CANCEL'
  | 'TRANSFER'
  | 'MEMORIALIZE'
  | 'DELETE'
  | 'PRESERVE'
  | 'UNCERTAIN';

const VALID_ACTIONS: DigitalAssetAction[] = [
  'CANCEL',
  'TRANSFER',
  'MEMORIALIZE',
  'DELETE',
  'PRESERVE',
  'UNCERTAIN',
];

/** GET /api/digital-assets/:id */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const asset = await prisma.digitalAsset.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
      include: {
        preferredHeir: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(asset);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** PATCH /api/digital-assets/:id — update any editable field. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const existing = await prisma.digitalAsset.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Password guard
    if ('password' in body || 'passwordPlain' in body || 'pwd' in body) {
      return NextResponse.json(
        { error: 'Digital Goodbye does not store passwords.' },
        { status: 400 },
      );
    }

    const {
      label,
      provider,
      identifier,
      passwordHint,
      intendedAction,
      preferredHeirId,
      instructions,
      instructionsEncrypted,
      priorityOrder,
    } = body as {
      label?: string;
      provider?: string | null;
      identifier?: string | null;
      passwordHint?: string | null;
      intendedAction?: DigitalAssetAction;
      preferredHeirId?: string | null;
      instructions?: string | null;
      instructionsEncrypted?: string | null;
      priorityOrder?: number;
    };

    if (intendedAction && !VALID_ACTIONS.includes(intendedAction)) {
      return NextResponse.json({ error: 'intendedAction must be valid' }, { status: 400 });
    }

    if (preferredHeirId) {
      const person = await prisma.person.findFirst({
        where: { id: preferredHeirId, principalId: principal.id, deletedAt: null },
      });
      if (!person) {
        return NextResponse.json(
          { error: 'preferredHeirId must reference a Person in your contacts' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.digitalAsset.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(identifier !== undefined ? { identifier } : {}),
        ...(passwordHint !== undefined ? { passwordHint } : {}),
        ...(intendedAction !== undefined ? { intendedAction } : {}),
        ...(preferredHeirId !== undefined ? { preferredHeirId } : {}),
        ...(instructions !== undefined ? { instructions } : {}),
        ...(instructionsEncrypted !== undefined ? { instructionsEncrypted } : {}),
        ...(priorityOrder !== undefined ? { priorityOrder } : {}),
      },
      include: {
        preferredHeir: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'digital_asset.updated',
        resourceType: 'DigitalAsset',
        resourceId: id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** DELETE /api/digital-assets/:id — soft-delete. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const existing = await prisma.digitalAsset.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.digitalAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'digital_asset.deleted',
        resourceType: 'DigitalAsset',
        resourceId: id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
