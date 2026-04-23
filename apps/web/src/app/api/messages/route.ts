import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

/**
 * GET /api/messages
 * List all messages for the current principal. Accepts optional ?status=DRAFT|SEALED|RELEASED|REVOKED.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json([]);

    const status = req.nextUrl.searchParams.get('status');
    const messages = await prisma.message.findMany({
      where: {
        tenantId: user.tenantId,
        principalId: principal.id,
        deletedAt: null,
        ...(status ? { status: status as 'DRAFT' | 'SEALED' | 'RELEASED' | 'REVOKED' | 'ARCHIVED' } : {}),
      },
      include: {
        recipients: { include: { person: { select: { id: true, firstName: true, lastName: true } } } },
        triggers: true,
        prompt: { select: { id: true, category: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      messages.map(serializeMessage),
    );
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * POST /api/messages
 * Create a new draft message.
 * Body: { title, mediaType: "AUDIO" | "LETTER", promptId?, bodyEncrypted? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({ error: 'No principal for this tenant' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      mediaType?: 'AUDIO' | 'LETTER';
      promptId?: string;
      bodyEncrypted?: string;
      playbackStyle?: 'AUDIO_ONLY' | 'RENDERED_CARD';
      cardTheme?:
        | 'PARCHMENT_WARM'
        | 'GOLD_DUST'
        | 'GARDEN_LETTER'
        | 'FAMILY_ALBUM'
        | 'MODERN_MINIMAL';
    };

    if (!body.title || !body.mediaType) {
      return NextResponse.json({ error: 'title and mediaType are required' }, { status: 400 });
    }
    if (body.mediaType !== 'AUDIO' && body.mediaType !== 'LETTER') {
      return NextResponse.json({ error: 'mediaType must be AUDIO or LETTER' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        tenantId: user.tenantId,
        principalId: principal.id,
        title: body.title,
        mediaType: body.mediaType,
        promptId: body.promptId ?? null,
        bodyEncrypted: body.bodyEncrypted ?? null,
        playbackStyle: body.playbackStyle ?? 'AUDIO_ONLY',
        cardTheme: body.cardTheme ?? null,
        status: 'DRAFT',
      },
      include: { recipients: true, triggers: true, prompt: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'message.created',
        resourceType: 'Message',
        resourceId: message.id,
        afterJson: { title: message.title, mediaType: message.mediaType },
      },
    });

    return NextResponse.json(serializeMessage(message), { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

type MessageWithRelations = Awaited<ReturnType<typeof prisma.message.findFirst>> & {
  recipients?: unknown[];
  triggers?: unknown[];
  prompt?: unknown;
};

export function serializeMessage(m: MessageWithRelations) {
  if (!m) return null;
  // BigInt / Date serialization — BigInt isn't JSON-serializable natively.
  return {
    ...m,
    mediaSizeBytes: m.mediaSizeBytes != null ? String(m.mediaSizeBytes) : null,
  };
}
