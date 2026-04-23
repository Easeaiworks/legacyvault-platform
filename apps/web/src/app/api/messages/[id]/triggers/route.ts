import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

type TriggerKind = 'TIME_ABSOLUTE' | 'TIME_RELATIVE_TO_DOB' | 'LIFE_EVENT' | 'DEATH_PLUS';
type TriggerEvent =
  | 'GRADUATION'
  | 'MARRIAGE'
  | 'FIRST_CHILD'
  | 'DIVORCE'
  | 'JOB_LOSS'
  | 'DIAGNOSIS'
  | 'GRIEF_FIRST_YEAR'
  | 'CUSTOM';

/**
 * PUT /api/messages/:id/triggers
 * Set or replace the trigger on a DRAFT message. Single trigger per message in MVP.
 * Body:
 *   { kind, releaseAt?, ageYears?, eventKind?, daysAfterDeath?, attestationPolicy? }
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as {
      kind?: TriggerKind;
      releaseAt?: string;
      ageYears?: number;
      eventKind?: TriggerEvent;
      daysAfterDeath?: number;
      attestationPolicy?: unknown;
    };

    if (!body.kind) {
      return NextResponse.json({ error: 'kind required' }, { status: 400 });
    }

    // Validate shape per kind
    switch (body.kind) {
      case 'TIME_ABSOLUTE':
        if (!body.releaseAt) {
          return NextResponse.json(
            { error: 'TIME_ABSOLUTE requires releaseAt' },
            { status: 400 },
          );
        }
        break;
      case 'TIME_RELATIVE_TO_DOB':
        if (body.ageYears == null || body.ageYears < 0 || body.ageYears > 150) {
          return NextResponse.json(
            { error: 'TIME_RELATIVE_TO_DOB requires ageYears (0-150)' },
            { status: 400 },
          );
        }
        break;
      case 'LIFE_EVENT':
        if (!body.eventKind) {
          return NextResponse.json(
            { error: 'LIFE_EVENT requires eventKind' },
            { status: 400 },
          );
        }
        break;
      case 'DEATH_PLUS':
        if (body.daysAfterDeath != null && (body.daysAfterDeath < 0 || body.daysAfterDeath > 3650)) {
          return NextResponse.json(
            { error: 'daysAfterDeath must be 0-3650' },
            { status: 400 },
          );
        }
        break;
      default:
        return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
    }

    const message = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (message.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only modify triggers on drafts' },
        { status: 409 },
      );
    }

    // Replace existing trigger(s)
    await prisma.messageTrigger.deleteMany({ where: { messageId: id } });
    const trigger = await prisma.messageTrigger.create({
      data: {
        messageId: id,
        kind: body.kind,
        releaseAt: body.releaseAt ? new Date(body.releaseAt) : null,
        ageYears: body.ageYears ?? null,
        eventKind: body.eventKind ?? null,
        daysAfterDeath: body.kind === 'DEATH_PLUS' ? (body.daysAfterDeath ?? 90) : null,
        attestationPolicy: (body.attestationPolicy as object) ?? null,
      },
    });

    return NextResponse.json(trigger, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
