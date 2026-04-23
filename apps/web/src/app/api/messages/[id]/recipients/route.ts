import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/messages/:id/recipients
 * Add a recipient (Person) to a DRAFT message.
 * Body: { personId: string }
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { personId?: string };
    if (!body.personId) {
      return NextResponse.json({ error: 'personId required' }, { status: 400 });
    }

    const message = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (message.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only add recipients to drafts' },
        { status: 409 },
      );
    }

    // Verify the Person belongs to this Principal
    const person = await prisma.person.findFirst({
      where: { id: body.personId, principalId: principal.id, deletedAt: null },
    });
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const recipient = await prisma.messageRecipient.upsert({
      where: { messageId_personId: { messageId: id, personId: body.personId } },
      create: { messageId: id, personId: body.personId },
      update: {},
      include: { person: true },
    });

    return NextResponse.json(recipient, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
