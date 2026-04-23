import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/recipes/:id */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
      include: {
        inheritors: {
          include: { person: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(recipe);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** PATCH /api/recipes/:id — update any editable field. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const existing = await prisma.recipe.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const {
      title,
      originStory,
      originStoryEncrypted,
      cuisineTags,
      servings,
      prepTimeMinutes,
      cookTimeMinutes,
      ingredients,
      steps,
      audioKey,
      audioDurationSec,
      coverImageKey,
    } = body as {
      title?: string;
      originStory?: string | null;
      originStoryEncrypted?: string | null;
      cuisineTags?: string[];
      servings?: number | null;
      prepTimeMinutes?: number | null;
      cookTimeMinutes?: number | null;
      ingredients?: unknown[];
      steps?: unknown[];
      audioKey?: string | null;
      audioDurationSec?: number | null;
      coverImageKey?: string | null;
    };

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(originStory !== undefined ? { originStory } : {}),
        ...(originStoryEncrypted !== undefined ? { originStoryEncrypted } : {}),
        ...(cuisineTags !== undefined ? { cuisineTags } : {}),
        ...(servings !== undefined ? { servings } : {}),
        ...(prepTimeMinutes !== undefined ? { prepTimeMinutes } : {}),
        ...(cookTimeMinutes !== undefined ? { cookTimeMinutes } : {}),
        ...(ingredients !== undefined ? { ingredients: ingredients as object } : {}),
        ...(steps !== undefined ? { steps: steps as object } : {}),
        ...(audioKey !== undefined ? { audioKey } : {}),
        ...(audioDurationSec !== undefined ? { audioDurationSec } : {}),
        ...(coverImageKey !== undefined ? { coverImageKey } : {}),
      },
      include: {
        inheritors: {
          include: { person: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'recipe.updated',
        resourceType: 'Recipe',
        resourceId: id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** DELETE /api/recipes/:id — soft-delete. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;

    const existing = await prisma.recipe.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.recipe.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'recipe.deleted',
        resourceType: 'Recipe',
        resourceId: id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
