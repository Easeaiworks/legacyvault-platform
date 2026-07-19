import { NextResponse } from 'next/server';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';
import { computeReadinessScore } from '@/lib/readiness-score';

/**
 * GET /api/readiness-score
 * Returns the computed Estate Readiness Score for the current principal.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({
        score: 0,
        categories: [],
        nextSteps: [],
      });
    }

    const score = await computeReadinessScore(principal.id);
    return NextResponse.json(score);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
