import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/messages/prompts
 * List prompt catalog. Returns system prompts + tenant-authored prompts.
 * Optional ?category=STORY|VALUES|APOLOGY|MILESTONE|RECIPE_STORY|HEIRLOOM|FUNERAL
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const category = req.nextUrl.searchParams.get('category');

    const prompts = await prisma.messagePrompt.findMany({
      where: {
        OR: [{ isSystem: true }, { tenantId: user.tenantId }],
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(prompts);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
