import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const OPS_ROLES = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT'];

const LISTABLE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'WITHDRAWN',
] as const;
type ListableStatus = (typeof LISTABLE_STATUSES)[number];

/**
 * GET /api/admin/death-verifications?status=SUBMITTED
 *
 * Ops-only list of death-verification submissions across all tenants.
 * Defaults to the actionable queue (SUBMITTED + UNDER_REVIEW).
 * DeathVerification has no Prisma relations by design, so principal and
 * submitter details are joined manually.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(OPS_ROLES);

    const statusParam = req.nextUrl.searchParams.get('status');
    const statuses: ListableStatus[] =
      statusParam && (LISTABLE_STATUSES as readonly string[]).includes(statusParam)
        ? [statusParam as ListableStatus]
        : ['SUBMITTED', 'UNDER_REVIEW'];

    const verifications = await prisma.deathVerification.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    const principalIds = [...new Set(verifications.map((v) => v.principalId))];
    const personIds = [...new Set(verifications.map((v) => v.submittedByPersonId))];

    const [principals, persons, trustedContacts] = await Promise.all([
      prisma.principal.findMany({
        where: { id: { in: principalIds } },
        select: { id: true, legalFirstName: true, legalLastName: true, residenceCountry: true },
      }),
      prisma.person.findMany({
        where: { id: { in: personIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.trustedContact.findMany({
        where: { principalId: { in: principalIds }, deletedAt: null },
        select: { id: true, principalId: true, waitingPeriodDays: true },
      }),
    ]);

    const principalById = new Map(principals.map((p) => [p.id, p]));
    const personById = new Map(persons.map((p) => [p.id, p]));
    const contactCountByPrincipal = new Map<string, number>();
    for (const tc of trustedContacts) {
      contactCountByPrincipal.set(
        tc.principalId,
        (contactCountByPrincipal.get(tc.principalId) ?? 0) + 1,
      );
    }

    return NextResponse.json({
      verifications: verifications.map((v) => {
        const principal = principalById.get(v.principalId);
        const submitter = personById.get(v.submittedByPersonId);
        return {
          id: v.id,
          status: v.status,
          principalName: principal
            ? `${principal.legalFirstName} ${principal.legalLastName}`
            : 'Unknown',
          principalCountry: principal?.residenceCountry ?? null,
          submitterName: submitter ? `${submitter.firstName} ${submitter.lastName}` : 'Unknown',
          submitterEmail: submitter?.email ?? null,
          supportingEvidence: v.supportingEvidence,
          submitterNotes: v.submitterNotes,
          documentId: v.documentId,
          trustedContactCount: contactCountByPrincipal.get(v.principalId) ?? 0,
          reviewNotes: v.reviewNotes,
          reviewedAt: v.reviewedAt,
          createdAt: v.createdAt,
        };
      }),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
