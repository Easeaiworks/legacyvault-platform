import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_KINDS = [
  'LAWYER',
  'FINANCIAL_PLANNER',
  'WILL_SERVICE',
  'INSURANCE_ADVISOR',
  'REFERRAL_SERVICE',
] as const;
type Kind = (typeof VALID_KINDS)[number];

/**
 * GET /api/providers?kind=LAWYER&country=US&region=CA
 * Public endpoint — provider directory is a public marketing surface.
 * No auth required.
 */
export async function GET(req: NextRequest) {
  const kindParam = req.nextUrl.searchParams.get('kind');
  const country = req.nextUrl.searchParams.get('country');
  const region = req.nextUrl.searchParams.get('region');

  const kind =
    kindParam && VALID_KINDS.includes(kindParam as Kind) ? (kindParam as Kind) : null;

  const providers = await prisma.provider.findMany({
    where: {
      publishedAt: { not: null },
      ...(kind ? { kind } : {}),
      ...(country ? { country } : {}),
      ...(region ? { regions: { hasSome: [region, 'ALL'] } } : {}),
    },
    orderBy: [{ discoveryPriority: 'desc' }, { displayName: 'asc' }],
  });

  return NextResponse.json(providers);
}
