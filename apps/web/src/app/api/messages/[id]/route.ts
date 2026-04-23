import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';
import { serializeMessage } from '../route';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/messages/:id — get one message with relations. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const message = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
      include: {
        recipients: { include: { person: true } },
        triggers: true,
        prompt: true,
      },
    });
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(serializeMessage(message));
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** PATCH /api/messages/:id — update a DRAFT. Sealed messages are immutable. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const existing = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Message is not a draft' }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      bodyEncrypted?: string | null;
      promptId?: string | null;
      mediaKey?: string | null;
      mediaDurationSec?: number | null;
      mediaSizeBytes?: number | null;
      mediaKeyWrapped?: string | null;
      transcriptEncrypted?: string | null;
      transcriptTimings?: unknown;
      playbackStyle?: 'AUDIO_ONLY' | 'RENDERED_CARD';
      cardTheme?:
        | 'PARCHMENT_WARM'
        | 'GOLD_DUST'
        | 'GARDEN_LETTER'
        | 'FAMILY_ALBUM'
        | 'MODERN_MINIMAL'
        | null;
    };

    const updated = await prisma.message.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.bodyEncrypted !== undefined ? { bodyEncrypted: body.bodyEncrypted } : {}),
        ...(body.promptId !== undefined ? { promptId: body.promptId } : {}),
        ...(body.mediaKey !== undefined ? { mediaKey: body.mediaKey } : {}),
        ...(body.mediaDurationSec !== undefined ? { mediaDurationSec: body.mediaDurationSec } : {}),
        ...(body.mediaSizeBytes !== undefined
          ? { mediaSizeBytes: body.mediaSizeBytes != null ? BigInt(body.mediaSizeBytes) : null }
          : {}),
        ...(body.mediaKeyWrapped !== undefined ? { mediaKeyWrapped: body.mediaKeyWrapped } : {}),
        ...(body.transcriptEncrypted !== undefined
          ? { transcriptEncrypted: body.transcriptEncrypted }
          : {}),
        ...(body.transcriptTimings !== undefined
          ? { transcriptTimings: body.transcriptTimings as object }
          : {}),
        ...(body.playbackStyle !== undefined ? { playbackStyle: body.playbackStyle } : {}),
        ...(body.cardTheme !== undefined ? { cardTheme: body.cardTheme } : {}),
      },
      include: { recipients: true, triggers: true, prompt: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'message.updated',
        resourceType: 'Message',
        resourceId: id,
      },
    });

    return NextResponse.json(serializeMessage(updated));
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * DELETE /api/messages/:id — delete a DRAFT, or revoke a SEALED/RELEASED message.
 * Draft: soft-delete (deletedAt). Sealed/Released: set status=REVOKED so recipients stop seeing it.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const existing = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (existing.status === 'DRAFT') {
      await prisma.message.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } else {
      await prisma.message.update({
        where: { id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: existing.status === 'DRAFT' ? 'message.deleted' : 'message.revoked',
        resourceType: 'Message',
        resourceId: id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
