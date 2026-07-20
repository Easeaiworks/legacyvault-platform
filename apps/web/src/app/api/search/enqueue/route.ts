import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';
import { enqueueForSubject } from '@/lib/search/dispatcher';

/**
 * POST /api/search/enqueue
 * Enqueue searches against every applicable source for the current Principal
 * and each deceased relative on file. Idempotent thanks to (principal, source)
 * uniqueness via skipDuplicates.
 */
export async function POST() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({ error: 'No principal for this tenant' }, { status: 400 });
    }

    let totalEnqueued = 0;

    // Enqueue for the Principal themselves.
    totalEnqueued += await enqueueForSubject({
      tenantId: user.tenantId,
      principalId: principal.id,
      subject: {
        legalFirstName: principal.legalFirstName,
        legalMiddleName: principal.legalMiddleName,
        legalLastName: principal.legalLastName,
        priorNames: Array.isArray(principal.priorNames)
          ? (principal.priorNames as string[])
          : [],
        dateOfBirth: principal.dateOfBirth,
        region: principal.residenceRegion,
        country: principal.residenceCountry,
      },
    });

    // Enqueue for each deceased relative.
    const relatives = await prisma.deceasedRelative.findMany({
      where: {
        tenantId: user.tenantId,
        principalId: principal.id,
        deletedAt: null,
      },
    });

    for (const r of relatives) {
      totalEnqueued += await enqueueForSubject({
        tenantId: user.tenantId,
        principalId: principal.id,
        deceasedRelativeId: r.id,
        subject: {
          legalFirstName: r.legalFirstName,
          legalMiddleName: r.legalMiddleName,
          legalLastName: r.legalLastName,
          priorNames: Array.isArray(r.priorNames) ? (r.priorNames as string[]) : [],
          dateOfBirth: r.dateOfBirth,
          city: r.lastKnownCity,
          region: r.lastKnownRegion,
          country: r.lastKnownCountry,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'search.enqueued',
        resourceType: 'SearchJob',
        afterJson: { count: totalEnqueued, relatives: relatives.length },
      },
    });

    return NextResponse.json({ enqueued: totalEnqueued, relatives: relatives.length });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
