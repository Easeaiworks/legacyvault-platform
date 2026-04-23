import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string; personId: string }> };

/** DELETE /api/messages/:id/recipients/:personId — remove a recipient from a DRAFT. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id, personId } = await ctx.params;

    const message = await prisma.message.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (message.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only modify recipients on drafts' },
        { status: 409 },
      );
    }

    await prisma.messageRecipient.deleteMany({
      where: { messageId: id, personId },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
