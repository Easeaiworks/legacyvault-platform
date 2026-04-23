import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/messages/:id/seal
 * Seal a draft. Validates that the message has at least one recipient and one trigger.
 * Sealed messages are immutable except for revocation.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const message = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
      include: { recipients: true, triggers: true },
    });
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (message.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only drafts can be sealed' }, { status: 409 });
    }

    // Validation gates
    if (message.recipients.length === 0) {
      return NextResponse.json(
        { error: 'Cannot seal: message has no recipients' },
        { status: 400 },
      );
    }
    if (message.triggers.length === 0) {
      return NextResponse.json(
        { error: 'Cannot seal: message has no trigger' },
        { status: 400 },
      );
    }
    if (message.mediaType === 'AUDIO' && !message.mediaKey) {
      return NextResponse.json(
        { error: 'Cannot seal audio message: no media uploaded' },
        { status: 400 },
      );
    }
    if (message.mediaType === 'LETTER' && !message.bodyEncrypted) {
      return NextResponse.json(
        { error: 'Cannot seal letter: body is empty' },
        { status: 400 },
      );
    }

    const sealed = await prisma.message.update({
      where: { id },
      data: { status: 'SEALED', sealedAt: new Date() },
      include: { recipients: { include: { person: true } }, triggers: true, prompt: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'message.sealed',
        resourceType: 'Message',
        resourceId: id,
        afterJson: { sealedAt: sealed.sealedAt?.toISOString() },
      },
    });

    return NextResponse.json({
      ...sealed,
      mediaSizeBytes: sealed.mediaSizeBytes != null ? String(sealed.mediaSizeBytes) : null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
