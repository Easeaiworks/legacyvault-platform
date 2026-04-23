import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

/**
 * GET /api/recipes — list recipes for current principal.
 * Optional ?tag=italian to filter by cuisine tag.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json([]);

    const tag = req.nextUrl.searchParams.get('tag');
    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId: user.tenantId,
        principalId: principal.id,
        deletedAt: null,
        ...(tag ? { cuisineTags: { has: tag } } : {}),
      },
      include: {
        inheritors: {
          include: { person: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(recipes);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * POST /api/recipes — create a recipe.
 * Body: { title (req), originStory?, cuisineTags?[], servings?, prepTimeMinutes?,
 *         cookTimeMinutes?, ingredients?[], steps?[] }
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
      originStory?: string | null;
      originStoryEncrypted?: string | null;
      cuisineTags?: string[];
      servings?: number | null;
      prepTimeMinutes?: number | null;
      cookTimeMinutes?: number | null;
      ingredients?: unknown[];
      steps?: unknown[];
    };

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const recipe = await prisma.recipe.create({
      data: {
        tenantId: user.tenantId,
        principalId: principal.id,
        title: body.title,
        originStory: body.originStory ?? null,
        originStoryEncrypted: body.originStoryEncrypted ?? null,
        cuisineTags: body.cuisineTags ?? [],
        servings: body.servings ?? null,
        prepTimeMinutes: body.prepTimeMinutes ?? null,
        cookTimeMinutes: body.cookTimeMinutes ?? null,
        ingredients: (body.ingredients ?? []) as object,
        steps: (body.steps ?? []) as object,
      },
      include: { inheritors: { include: { person: true } } },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'recipe.created',
        resourceType: 'Recipe',
        resourceId: recipe.id,
        afterJson: { title: recipe.title },
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
