import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

/**
 * GET /api/search/matches
 * Returns all SearchMatch rows for the current Principal, grouped by review
 * status. Only matches above the review threshold are stored, so any row here
 * is worth showing to the user (subject to confidence UI treatment).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ matches: [], summary: null });

    const matches = await prisma.searchMatch.findMany({
      where: {
        tenantId: user.tenantId,
        principalId: principal.id,
      },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        source: true,
        matchJson: true,
        summary: true,
        confidence: true,
        reportedValueCents: true,
        currency: true,
        reviewStatus: true,
        deceasedRelativeId: true,
        createdAt: true,
      },
    });

    const summary = {
      total: matches.length,
      confirmed: matches.filter((m) => m.reviewStatus === 'CONFIRMED').length,
      underReview: matches.filter((m) => m.reviewStatus === 'UNDER_REVIEW').length,
      new: matches.filter((m) => m.reviewStatus === 'NEW').length,
      dismissed: matches.filter((m) => m.reviewStatus === 'DISMISSED').length,
    };

    return NextResponse.json({ matches, summary });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
