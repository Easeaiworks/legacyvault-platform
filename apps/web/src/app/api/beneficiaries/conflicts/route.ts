import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

interface Conflict {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  assetId?: string;
  personId?: string;
  suggestedAction?: string;
}

/**
 * Beneficiary conflict detection — mirrors the NestJS ConflictDetectionService
 * but runs inline in the Next.js API route. Covers the three demo-critical
 * cases: missing primary beneficiary, under-allocated shares, inconsistent
 * coverage across retirement accounts.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json([]);

    const assets = await prisma.asset.findMany({
      where: { principalId: principal.id, deletedAt: null },
      include: {
        beneficiaries: {
          where: { deletedAt: null },
          include: { person: true },
        },
      },
    });

    const conflicts: Conflict[] = [];

    for (const asset of assets) {
      const primaries = asset.beneficiaries.filter((b) => b.designation === 'PRIMARY');
      const primarySum = primaries.reduce((s, b) => s + b.shareBps, 0);

      if (primaries.length === 0 && requiresBeneficiary(asset.type)) {
        conflicts.push({
          id: `no-primary-${asset.id}`,
          severity: 'warning',
          title: `No primary beneficiary on ${asset.nickname}`,
          detail:
            "Retirement and insurance assets pass outside your will. Without a designated beneficiary, the asset may be distributed by default rules that don't match your wishes.",
          assetId: asset.id,
          suggestedAction: 'Add a primary beneficiary',
        });
      }

      if (primaries.length > 0 && primarySum < 10000) {
        conflicts.push({
          id: `under-allocated-${asset.id}`,
          severity: 'error',
          title: `${asset.nickname} is under-allocated (${(primarySum / 100).toFixed(2)}%)`,
          detail:
            'Primary beneficiary shares must sum to 100%. The missing percentage will fall back to default distribution rules.',
          assetId: asset.id,
          suggestedAction: 'Adjust shares to total 100%',
        });
      }
    }

    const retirementAssets = assets.filter((a) => a.category === 'RETIREMENT');
    if (retirementAssets.length > 1) {
      const personCoverage = new Map<string, { covered: Set<string>; name: string }>();
      for (const a of retirementAssets) {
        for (const b of a.beneficiaries.filter((x) => x.designation === 'PRIMARY')) {
          const entry = personCoverage.get(b.personId) ?? {
            covered: new Set<string>(),
            name: `${b.person.firstName} ${b.person.lastName}`,
          };
          entry.covered.add(a.id);
          personCoverage.set(b.personId, entry);
        }
      }
      for (const [personId, { covered, name }] of personCoverage) {
        if (covered.size > 0 && covered.size < retirementAssets.length) {
          const missing = retirementAssets.filter((a) => !covered.has(a.id));
          conflicts.push({
            id: `inconsistent-${personId}`,
            severity: 'info',
            title: `${name} is not on every retirement account`,
            detail: `You've named this person on some but not all of your retirement accounts (missing: ${missing
              .map((m) => m.nickname)
              .join(', ')}). This may be intentional — just double-check.`,
            personId,
            suggestedAction: 'Review retirement account beneficiaries',
          });
        }
      }
    }

    return NextResponse.json(conflicts);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

function requiresBeneficiary(type: string): boolean {
  return (
    type.startsWith('LIFE_INSURANCE_') ||
    type === 'ANNUITY' ||
    ['IRA_TRADITIONAL','IRA_ROTH','K401','K403B','K457','SEP_IRA','SIMPLE_IRA','RRSP','RRIF','TFSA','LIRA','LIF','RDSP'].includes(type)
  );
}
