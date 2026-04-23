import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string; personId: string }> };

/** DELETE /api/recipes/:id/inheritors/:personId — remove an inheritor. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id, personId } = await ctx.params;

    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.recipeInheritor.deleteMany({
      where: { recipeId: id, personId },
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
