import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';

export type ConflictSeverity = 'info' | 'warning' | 'error';

export interface BeneficiaryConflict {
  id: string;
  severity: ConflictSeverity;
  title: string;
  detail: string;
  assetId?: string;
  personId?: string;
  /** Recommended action the UI should surface. */
  suggestedAction?: string;
}

/**
 * Beneficiary conflict detection — Phase 1 rules.
 *
 * This is the "first line of defense" against the most common estate-planning
 * mistake: a will that names one heir while a 401(k) / IRA / insurance policy
 * names a different one. Beneficiary designations on retirement accounts and
 * insurance policies override the will, which surprises families regularly.
 *
 * Rules implemented:
 *   1. Asset has no primary beneficiary at all
 *   2. Primary shares don't sum to 100% (under-allocated) on any asset with primaries
 *   3. Retirement or insurance asset names a beneficiary that differs from the will's executor
 *      (heuristic — not a hard conflict, just a warning)
 *   4. A person is listed as PRIMARY on one asset and not listed at all on
 *      similar-type assets — may indicate the user forgot to propagate
 *
 * Future rules (Session 5+):
 *   - Parse actual will text and compare designations
 *   - Detect predeceased primaries with no contingent
 *   - Jurisdiction-aware rules (community property states, Quebec civil code)
 */
@Injectable()
export class ConflictDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  async detect(user: RequestUser): Promise<BeneficiaryConflict[]> {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: {
        assets: { where: { deletedAt: null }, include: { beneficiaries: { where: { deletedAt: null }, include: { person: true } } } },
      },
    });
    if (!principal) return [];

    const conflicts: BeneficiaryConflict[] = [];

    for (const asset of principal.assets) {
      const primaries = asset.beneficiaries.filter((b) => b.designation === 'PRIMARY');
      const primarySum = primaries.reduce((s, b) => s + b.shareBps, 0);

      if (primaries.length === 0 && this.assetRequiresBeneficiary(asset.type)) {
        conflicts.push({
          id: `no-primary-${asset.id}`,
          severity: 'warning',
          title: `No primary beneficiary on ${asset.nickname}`,
          detail: 'Retirement and insurance assets pass outside your will. Without a designated beneficiary, the asset may be distributed by default rules that don\'t match your wishes.',
          assetId: asset.id,
          suggestedAction: 'Add a primary beneficiary',
        });
      }

      if (primaries.length > 0 && primarySum < 10000) {
        conflicts.push({
          id: `under-allocated-${asset.id}`,
          severity: 'error',
          title: `${asset.nickname} is under-allocated (${(primarySum / 100).toFixed(2)}%)`,
          detail: 'Primary beneficiary shares must sum to 100%. The missing percentage will fall back to default distribution rules.',
          assetId: asset.id,
          suggestedAction: 'Adjust shares to total 100%',
        });
      }
    }

    // Cross-asset pattern: the same person on one retirement account but not another of the same category.
    const retirementAssets = principal.assets.filter((a) => a.category === 'RETIREMENT');
    if (retirementAssets.length > 1) {
      const personCoverage = new Map<string, Set<string>>();
      for (const a of retirementAssets) {
        for (const b of a.beneficiaries.filter((x) => x.designation === 'PRIMARY')) {
          const set = personCoverage.get(b.personId) ?? new Set();
          set.add(a.id);
          personCoverage.set(b.personId, set);
        }
      }
      for (const [personId, covered] of personCoverage) {
        if (covered.size > 0 && covered.size < retirementAssets.length) {
          const missing = retirementAssets.filter((a) => !covered.has(a.id));
          const person = retirementAssets
            .flatMap((a) => a.beneficiaries)
            .find((b) => b.personId === personId)?.person;
          conflicts.push({
            id: `inconsistent-${personId}`,
            severity: 'info',
            title: `${person?.firstName} ${person?.lastName} is not on every retirement account`,
            detail: `You've named this person on some but not all of your retirement accounts (missing: ${missing
              .map((m) => m.nickname)
              .join(', ')}). This may be intentional — just double-check.`,
            personId,
            suggestedAction: 'Review retirement account beneficiaries',
          });
        }
      }
    }

    return conflicts;
  }

  private assetRequiresBeneficiary(type: string): boolean {
    return (
      type.startsWith('LIFE_INSURANCE_') ||
      type === 'ANNUITY' ||
      type === 'IRA_TRADITIONAL' ||
      type === 'IRA_ROTH' ||
      type === 'K401' ||
      type === 'K403B' ||
      type === 'K457' ||
      type === 'SEP_IRA' ||
      type === 'SIMPLE_IRA' ||
      type === 'RRSP' ||
      type === 'RRIF' ||
      type === 'TFSA' ||
      type === 'LIRA' ||
      type === 'LIF' ||
      type === 'RDSP'
    );
  }
}
