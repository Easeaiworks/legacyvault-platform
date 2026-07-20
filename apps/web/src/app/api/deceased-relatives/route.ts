import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';
import { encryptField } from '@/lib/crypto';

type Relationship =
  | 'SPOUSE'
  | 'PARENT'
  | 'SIBLING'
  | 'GRANDPARENT'
  | 'GREAT_GRANDPARENT'
  | 'AUNT_UNCLE'
  | 'COUSIN'
  | 'OTHER';

const VALID_RELATIONSHIPS: Relationship[] = [
  'SPOUSE',
  'PARENT',
  'SIBLING',
  'GRANDPARENT',
  'GREAT_GRANDPARENT',
  'AUNT_UNCLE',
  'COUSIN',
  'OTHER',
];

/**
 * GET /api/deceased-relatives
 * List deceased-relative records for the current principal.
 * Encrypted fields (gov_id_full_encrypted) are always omitted from list view.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json([]);

    const relatives = await prisma.deceasedRelative.findMany({
      where: {
        tenantId: user.tenantId,
        principalId: principal.id,
        deletedAt: null,
      },
      orderBy: [{ legalLastName: 'asc' }, { legalFirstName: 'asc' }],
      select: {
        id: true,
        legalFirstName: true,
        legalMiddleName: true,
        legalLastName: true,
        priorNames: true,
        relationship: true,
        dateOfBirth: true,
        dateOfDeath: true,
        birthCity: true,
        birthCountry: true,
        lastKnownCity: true,
        lastKnownRegion: true,
        lastKnownCountry: true,
        previousAddresses: true,
        employers: true,
        financialInstitutions: true,
        govIdCountry: true,
        govIdLast4: true,
        // gov_id_full_encrypted intentionally omitted
        militaryService: true,
        deathCertificateAvailable: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(relatives);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * POST /api/deceased-relatives
 * Create a new deceased-relative record.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({ error: 'No principal for this tenant' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const {
      legalFirstName,
      legalMiddleName,
      legalLastName,
      priorNames,
      relationship,
      dateOfBirth,
      dateOfDeath,
      birthCity,
      birthCountry,
      lastKnownCity,
      lastKnownRegion,
      lastKnownCountry,
      previousAddresses,
      employers,
      financialInstitutions,
      govIdCountry,
      govIdLast4,
      govIdFull,
      militaryService,
      deathCertificateAvailable,
      notes,
    } = body as {
      legalFirstName?: string;
      legalMiddleName?: string;
      legalLastName?: string;
      priorNames?: Prisma.InputJsonValue[];
      relationship?: Relationship;
      dateOfBirth?: string;
      dateOfDeath?: string;
      birthCity?: string;
      birthCountry?: string;
      lastKnownCity?: string;
      lastKnownRegion?: string;
      lastKnownCountry?: string;
      previousAddresses?: Prisma.InputJsonValue[];
      employers?: Prisma.InputJsonValue[];
      financialInstitutions?: Prisma.InputJsonValue[];
      govIdCountry?: string;
      govIdLast4?: string;
      govIdFull?: string;
      militaryService?: boolean;
      deathCertificateAvailable?: boolean;
      notes?: string;
    };

    if (!legalFirstName || !legalLastName) {
      return NextResponse.json(
        { error: 'legalFirstName and legalLastName are required' },
        { status: 400 },
      );
    }
    if (!relationship || !VALID_RELATIONSHIPS.includes(relationship)) {
      return NextResponse.json(
        { error: 'relationship is required and must be a valid deceased-relative relationship' },
        { status: 400 },
      );
    }
    if (govIdLast4 && !/^\d{4}$/.test(govIdLast4)) {
      return NextResponse.json(
        { error: 'govIdLast4 must be exactly 4 digits' },
        { status: 400 },
      );
    }
    if (govIdFull) {
      // Basic shape check: SSN 9 digits or SIN 9 digits (Luhn not enforced here).
      const stripped = govIdFull.replace(/\D/g, '');
      if (stripped.length !== 9) {
        return NextResponse.json(
          { error: 'govIdFull must be 9 digits (SSN or SIN)' },
          { status: 400 },
        );
      }
    }

    const govIdFullEncrypted = govIdFull ? encryptField(govIdFull) : null;

    const relative = await prisma.deceasedRelative.create({
      data: {
        tenantId: user.tenantId,
        principalId: principal.id,
        legalFirstName,
        legalMiddleName: legalMiddleName ?? null,
        legalLastName,
        priorNames: Array.isArray(priorNames) ? priorNames : [],
        relationship,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null,
        birthCity: birthCity ?? null,
        birthCountry: birthCountry ?? null,
        lastKnownCity: lastKnownCity ?? null,
        lastKnownRegion: lastKnownRegion ?? null,
        lastKnownCountry: lastKnownCountry ?? null,
        previousAddresses: Array.isArray(previousAddresses) ? previousAddresses : [],
        employers: Array.isArray(employers) ? employers : [],
        financialInstitutions: Array.isArray(financialInstitutions) ? financialInstitutions : [],
        govIdCountry: govIdCountry ?? null,
        govIdLast4: govIdLast4 ?? null,
        govIdFullEncrypted,
        militaryService: militaryService ?? false,
        deathCertificateAvailable: deathCertificateAvailable ?? false,
        notes: notes ?? null,
      },
      select: {
        id: true,
        legalFirstName: true,
        legalMiddleName: true,
        legalLastName: true,
        relationship: true,
        dateOfDeath: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'deceased_relative.created',
        resourceType: 'DeceasedRelative',
        resourceId: relative.id,
        afterJson: {
          legalLastName,
          legalFirstName,
          relationship,
          hasGovIdFull: Boolean(govIdFull),
        },
      },
    });

    return NextResponse.json(relative, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
