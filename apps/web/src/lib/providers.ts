import { prisma } from './prisma';

export type ProviderKind =
  | 'LAWYER'
  | 'FINANCIAL_PLANNER'
  | 'WILL_SERVICE'
  | 'INSURANCE_ADVISOR'
  | 'REFERRAL_SERVICE';

export async function listProviders(opts: {
  kinds?: ProviderKind[];
  country?: 'US' | 'CA';
  region?: string;
}) {
  return prisma.provider.findMany({
    where: {
      publishedAt: { not: null },
      ...(opts.kinds && opts.kinds.length > 0 ? { kind: { in: opts.kinds } } : {}),
      ...(opts.country ? { country: opts.country } : {}),
      ...(opts.region
        ? { regions: { hasSome: [opts.region, 'ALL'] } }
        : {}),
    },
    orderBy: [{ discoveryPriority: 'desc' }, { displayName: 'asc' }],
  });
}
