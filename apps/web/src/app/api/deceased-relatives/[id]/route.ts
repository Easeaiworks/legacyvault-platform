import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';
import { encryptField } from '@/lib/crypto';
import { isUuid } from '@/lib/ids';

type Ctx = { params: Promise<{ id: string }> };

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

/** GET /api/deceased-relatives/:id */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const relative = await prisma.deceasedRelative.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
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
        militaryService: true,
        deathCertificateAvailable: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!relative) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(relative);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** PATCH /api/deceased-relatives/:id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = await prisma.deceasedRelative.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
      legalMiddleName?: string | null;
      legalLastName?: string;
      priorNames?: Prisma.InputJsonValue[];
      relationship?: Relationship;
      dateOfBirth?: string | null;
      dateOfDeath?: string | null;
      birthCity?: string | null;
      birthCountry?: string | null;
      lastKnownCity?: string | null;
      lastKnownRegion?: string | null;
      lastKnownCountry?: string | null;
      previousAddresses?: Prisma.InputJsonValue[];
      employers?: Prisma.InputJsonValue[];
      financialInstitutions?: Prisma.InputJsonValue[];
      govIdCountry?: string | null;
      govIdLast4?: string | null;
      govIdFull?: string | null;
      militaryService?: boolean;
      deathCertificateAvailable?: boolean;
      notes?: string | null;
    };

    if (relationship !== undefined && !VALID_RELATIONSHIPS.includes(relationship)) {
      return NextResponse.json({ error: 'relationship must be valid' }, { status: 400 });
    }
    if (govIdLast4 && !/^\d{4}$/.test(govIdLast4)) {
      return NextResponse.json({ error: 'govIdLast4 must be 4 digits' }, { status: 400 });
    }
    let govIdFullEncrypted: string | null | undefined;
    if (govIdFull !== undefined) {
      if (govIdFull === null || govIdFull === '') {
        govIdFullEncrypted = null;
      } else {
        const stripped = govIdFull.replace(/\D/g, '');
        if (stripped.length !== 9) {
          return NextResponse.json({ error: 'govIdFull must be 9 digits' }, { status: 400 });
        }
        govIdFullEncrypted = encryptField(govIdFull);
      }
    }

    const updated = await prisma.deceasedRelative.update({
      where: { id },
      data: {
        ...(legalFirstName !== undefined ? { legalFirstName } : {}),
        ...(legalMiddleName !== undefined ? { legalMiddleName } : {}),
        ...(legalLastName !== undefined ? { legalLastName } : {}),
        ...(priorNames !== undefined ? { priorNames: Array.isArray(priorNames) ? priorNames : [] } : {}),
        ...(relationship !== undefined ? { relationship } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
        ...(dateOfDeath !== undefined ? { dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null } : {}),
        ...(birthCity !== undefined ? { birthCity } : {}),
        ...(birthCountry !== undefined ? { birthCountry } : {}),
        ...(lastKnownCity !== undefined ? { lastKnownCity } : {}),
        ...(lastKnownRegion !== undefined ? { lastKnownRegion } : {}),
        ...(lastKnownCountry !== undefined ? { lastKnownCountry } : {}),
        ...(previousAddresses !== undefined
          ? { previousAddresses: Array.isArray(previousAddresses) ? previousAddresses : [] }
          : {}),
        ...(employers !== undefined
          ? { employers: Array.isArray(employers) ? employers : [] }
          : {}),
        ...(financialInstitutions !== undefined
          ? {
              financialInstitutions: Array.isArray(financialInstitutions)
                ? financialInstitutions
                : [],
            }
          : {}),
        ...(govIdCountry !== undefined ? { govIdCountry } : {}),
        ...(govIdLast4 !== undefined ? { govIdLast4 } : {}),
        ...(govIdFullEncrypted !== undefined ? { govIdFullEncrypted } : {}),
        ...(militaryService !== undefined ? { militaryService } : {}),
        ...(deathCertificateAvailable !== undefined ? { deathCertificateAvailable } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      select: {
        id: true,
        legalFirstName: true,
        legalLastName: true,
        relationship: true,
        dateOfDeath: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'deceased_relative.updated',
        resourceType: 'DeceasedRelative',
        resourceId: id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** DELETE /api/deceased-relatives/:id — soft-delete. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = await prisma.deceasedRelative.findFirst({
      where: { id, tenantId: user.tenantId, principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.deceasedRelative.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'deceased_relative.deleted',
        resourceType: 'DeceasedRelative',
        resourceId: id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
