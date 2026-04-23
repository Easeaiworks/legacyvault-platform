import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/recipes/:id/inheritors
 * Add an inheritor (Person) to a recipe.
 * Body: { personId }
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

    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const person = await prisma.person.findFirst({
      where: { id: body.personId, principalId: principal.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

    const inheritor = await prisma.recipeInheritor.upsert({
      where: { recipeId_personId: { recipeId: id, personId: body.personId } },
      create: { recipeId: id, personId: body.personId },
      update: {},
      include: { person: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json(inheritor, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
