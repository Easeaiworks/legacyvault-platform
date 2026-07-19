import { prisma } from './prisma';

/**
 * Estate Readiness Score — the dashboard's headline metric.
 *
 * Consolidates category-level progress into a single 0–100 number. Weights are
 * chosen so that the "essential" documents (will, POA-property, POA-personal-care,
 * beneficiary designations, asset inventory) collectively account for 70 of the 100.
 * The remaining 30 covers the softer legacy modules.
 *
 * Every sub-score is computed server-side against Prisma data, so the number
 * is authoritative — the UI just renders it.
 */

export interface ScoreCategory {
  id: string;
  label: string;
  weight: number;    // out of 100
  earned: number;    // out of weight
  actionable: boolean;
  suggestion?: string;
  href?: string;
}

export interface ReadinessScore {
  score: number;               // 0-100
  categories: ScoreCategory[];
  nextSteps: Array<{           // top 3 highest-leverage remaining items
    label: string;
    detail: string;
    href: string;
    valuePoints: number;       // how much score this earns
  }>;
}

export async function computeReadinessScore(principalId: string): Promise<ReadinessScore> {
  // Fetch everything in parallel
  const [
    docs,
    assets,
    beneficiaries,
    trustedContacts,
    funeralWishes,
    digitalAssets,
    messagesCount,
    lifeInsuranceCount,
  ] = await Promise.all([
    prisma.document.findMany({
      where: { principalId, deletedAt: null },
      select: { id: true, category: true, documentDate: true },
    }),
    prisma.asset.findMany({
      where: { principalId, deletedAt: null },
      select: { id: true, type: true, estimatedValueCents: true },
    }),
    prisma.beneficiary.findMany({
      where: { principalId, deletedAt: null },
      select: { id: true },
    }),
    prisma.trustedContact.findMany({
      where: { principalId, deletedAt: null },
      select: { id: true },
    }),
    prisma.funeralWishes.findFirst({
      where: { principalId, deletedAt: null },
      select: { completionPercentage: true },
    }),
    prisma.digitalAsset.findMany({
      where: { principalId, deletedAt: null },
      select: { id: true },
    }),
    prisma.message.count({
      where: { principalId, status: { in: ['SEALED', 'RELEASED'] }, deletedAt: null },
    }),
    prisma.asset.count({
      where: {
        principalId,
        deletedAt: null,
        type: {
          in: [
            'LIFE_INSURANCE_TERM',
            'LIFE_INSURANCE_WHOLE',
            'LIFE_INSURANCE_UNIVERSAL',
          ],
        },
      },
    }),
  ]);

  // Also run the beneficiary conflict detection (inline; keeps this file self-contained)
  const conflictCount = await countBeneficiaryConflicts(principalId);

  const categories: ScoreCategory[] = [
    scoreWill(docs),
    scorePoaProperty(docs),
    scorePoaPersonalCare(docs),
    scoreBeneficiaries(beneficiaries.length, conflictCount),
    scoreAssets(assets.length),
    scoreTrustedContacts(trustedContacts.length),
    scoreFuneralWishes(funeralWishes?.completionPercentage ?? 0),
    scoreDigitalGoodbye(digitalAssets.length),
    scoreMessages(messagesCount),
    scoreLifeInsurance(lifeInsuranceCount),
  ];

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const totalEarned = categories.reduce((s, c) => s + c.earned, 0);
  const score = Math.round((totalEarned / totalWeight) * 100);

  // Next steps: highest-leverage remaining items, top 3
  const remaining = categories
    .filter((c) => c.earned < c.weight && c.actionable && c.suggestion && c.href)
    .sort((a, b) => b.weight - a.weight - (a.earned - b.earned))
    .slice(0, 3)
    .map((c) => ({
      label: c.suggestion!,
      detail: `${c.label} — currently ${c.earned}/${c.weight} points`,
      href: c.href!,
      valuePoints: c.weight - c.earned,
    }));

  return { score, categories, nextSteps: remaining };
}

// --- category scorers --------------------------------------------------

function scoreWill(docs: Array<{ category: string; documentDate: Date | null }>): ScoreCategory {
  const wills = docs.filter((d) => d.category === 'WILL');
  const has = wills.length > 0;
  const recent = wills.some(
    (w) => w.documentDate && w.documentDate.getTime() > Date.now() - 5 * 365 * 86400_000,
  );
  const earned = has ? (recent ? 20 : 15) : 0;
  return {
    id: 'WILL',
    label: 'Last will and testament',
    weight: 20,
    earned,
    actionable: earned < 20,
    suggestion: !has
      ? 'Upload your signed will'
      : !recent
        ? 'Your will is more than 5 years old — consider a review'
        : undefined,
    href: '/app/documents',
  };
}

function scorePoaProperty(docs: Array<{ category: string; documentDate: Date | null }>): ScoreCategory {
  const has = docs.some((d) => d.category === 'POWER_OF_ATTORNEY');
  return {
    id: 'POA_PROPERTY',
    label: 'Power of attorney for property',
    weight: 15,
    earned: has ? 15 : 0,
    actionable: !has,
    suggestion: has ? undefined : 'Upload your financial POA',
    href: '/app/documents',
  };
}

function scorePoaPersonalCare(docs: Array<{ category: string }>): ScoreCategory {
  const has = docs.some(
    (d) => d.category === 'HEALTHCARE_DIRECTIVE' || d.category === 'LIVING_WILL',
  );
  return {
    id: 'POA_PERSONAL_CARE',
    label: 'Healthcare directive',
    weight: 10,
    earned: has ? 10 : 0,
    actionable: !has,
    suggestion: has ? undefined : 'Upload your healthcare directive',
    href: '/app/documents',
  };
}

function scoreBeneficiaries(count: number, conflicts: number): ScoreCategory {
  // 15 points total: 10 for having beneficiaries at all, 5 for having no conflicts
  const basePoints = count > 0 ? 10 : 0;
  const cleanPoints = count > 0 && conflicts === 0 ? 5 : 0;
  const earned = basePoints + cleanPoints;
  return {
    id: 'BENEFICIARIES',
    label: 'Beneficiary designations',
    weight: 15,
    earned,
    actionable: earned < 15,
    suggestion:
      count === 0
        ? 'Designate beneficiaries on your accounts'
        : conflicts > 0
          ? `Resolve ${conflicts} beneficiary issue${conflicts > 1 ? 's' : ''}`
          : undefined,
    href: '/app/beneficiaries',
  };
}

function scoreAssets(count: number): ScoreCategory {
  // Ramp up: 0 → 0, 1 → 2, 3 → 6, 5+ → 10
  const earned = Math.min(10, Math.max(0, count * 2));
  return {
    id: 'ASSETS',
    label: 'Asset inventory',
    weight: 10,
    earned,
    actionable: earned < 10,
    suggestion:
      count === 0
        ? 'Add your first asset'
        : count < 5
          ? `Add more assets (${count} logged; aim for 5+)`
          : undefined,
    href: '/app/assets',
  };
}

function scoreTrustedContacts(count: number): ScoreCategory {
  return {
    id: 'TRUSTED_CONTACTS',
    label: 'Trusted contacts',
    weight: 5,
    earned: count > 0 ? 5 : 0,
    actionable: count === 0,
    suggestion: count > 0 ? undefined : 'Nominate a trusted contact',
    href: '/app/contacts',
  };
}

function scoreFuneralWishes(completion: number): ScoreCategory {
  const earned = Math.round((completion / 100) * 5);
  return {
    id: 'FUNERAL_WISHES',
    label: 'Funeral wishes',
    weight: 5,
    earned,
    actionable: earned < 5,
    suggestion:
      completion === 0
        ? 'Draft your funeral wishes'
        : completion < 100
          ? `Complete your funeral wishes (${completion}% done)`
          : undefined,
    href: '/app/wishes',
  };
}

function scoreDigitalGoodbye(count: number): ScoreCategory {
  const earned = Math.min(5, count);
  return {
    id: 'DIGITAL_GOODBYE',
    label: 'Digital goodbye',
    weight: 5,
    earned,
    actionable: earned < 5,
    suggestion:
      count === 0
        ? 'Start your digital goodbye list'
        : count < 5
          ? `Add more digital assets (${count} logged)`
          : undefined,
    href: '/app/digital-goodbye',
  };
}

function scoreMessages(count: number): ScoreCategory {
  return {
    id: 'MESSAGES',
    label: 'Messages for loved ones',
    weight: 5,
    earned: count > 0 ? 5 : 0,
    actionable: count === 0,
    suggestion: count > 0 ? undefined : 'Record or write a message for someone you love',
    href: '/app/messages',
  };
}

function scoreLifeInsurance(count: number): ScoreCategory {
  return {
    id: 'LIFE_INSURANCE',
    label: 'Life insurance on file',
    weight: 5,
    earned: count > 0 ? 5 : 0,
    actionable: count === 0,
    suggestion: count > 0 ? undefined : 'Log your life insurance policy',
    href: '/app/assets',
  };
}

// --- helper: count beneficiary conflicts inline -----------------------

async function countBeneficiaryConflicts(principalId: string): Promise<number> {
  // Reuse the same logic patterns from /api/beneficiaries/conflicts.
  // Kept intentionally simple for the score; the dedicated audit page shows detail.
  const assets = await prisma.asset.findMany({
    where: { principalId, deletedAt: null },
    include: {
      beneficiaries: { where: { deletedAt: null }, include: { person: true } },
    },
  });

  let conflicts = 0;
  for (const asset of assets) {
    if (asset.beneficiaries.length === 0) continue;
    const primaries = asset.beneficiaries.filter((b) => b.designation === 'PRIMARY');
    const primarySum = primaries.reduce((s, b) => s + b.shareBps, 0);

    // Missing primary designation on beneficiary-designated retirement / insurance
    if (
      primaries.length === 0 &&
      [
        'K401',
        'K403B',
        'K457',
        'IRA_TRADITIONAL',
        'IRA_ROTH',
        'RRSP',
        'RRIF',
        'TFSA',
        'LIFE_INSURANCE_TERM',
        'LIFE_INSURANCE_WHOLE',
      ].includes(asset.type)
    ) {
      conflicts++;
    }
    // Under-allocated primary shares
    if (primaries.length > 0 && primarySum < 10000) conflicts++;
    // Over-allocated primary shares
    if (primarySum > 10000) conflicts++;
  }
  return conflicts;
}
