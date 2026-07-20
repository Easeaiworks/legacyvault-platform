import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { isUuid } from '@/lib/ids';

const OPS_ROLES = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT'];

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/death-verifications/:id
 *
 * Body: { action: 'start_review' | 'approve' | 'reject'; reviewNotes?: string }
 *
 * - start_review: SUBMITTED -> UNDER_REVIEW
 * - reject:      SUBMITTED | UNDER_REVIEW -> REJECTED (reviewNotes required)
 * - approve:     SUBMITTED | UNDER_REVIEW -> VERIFIED, and in the same
 *   transaction creates a TRIGGERED TrustedContactGrant for every active
 *   trusted contact of the principal that doesn't already hold a live grant.
 *   Each grant's unlocksAt honors that contact's own waitingPeriodDays.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireRole(OPS_ROLES);
    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      reviewNotes?: string;
    };
    const { action, reviewNotes } = body;

    if (!action || !['start_review', 'approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'start_review', 'approve', or 'reject'" },
        { status: 400 },
      );
    }
    if (action === 'reject' && !reviewNotes?.trim()) {
      return NextResponse.json(
        { error: 'reviewNotes is required when rejecting' },
        { status: 400 },
      );
    }

    const dv = await prisma.deathVerification.findUnique({ where: { id } });
    if (!dv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reviewable = ['SUBMITTED', 'UNDER_REVIEW'];
    if (!reviewable.includes(dv.status)) {
      return NextResponse.json(
        { error: `Verification is already ${dv.status} and can no longer be actioned` },
        { status: 409 },
      );
    }

    if (action === 'start_review') {
      const updated = await prisma.deathVerification.update({
        where: { id },
        data: { status: 'UNDER_REVIEW', reviewedByUserId: user.id },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: dv.tenantId,
          userId: user.id,
          event: 'death_verification.review_started',
          resourceType: 'DeathVerification',
          resourceId: id,
        },
      });
      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    if (action === 'reject') {
      const updated = await prisma.deathVerification.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes!.trim(),
        },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: dv.tenantId,
          userId: user.id,
          event: 'death_verification.rejected',
          resourceType: 'DeathVerification',
          resourceId: id,
          afterJson: { reviewNotes: reviewNotes!.trim() },
        },
      });
      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    // action === 'approve'
    const contacts = await prisma.trustedContact.findMany({
      where: { principalId: dv.principalId, deletedAt: null },
      include: {
        accessGrants: {
          where: { status: { in: ['PENDING', 'TRIGGERED', 'UNLOCKED'] } },
          select: { id: true, status: true },
        },
      },
    });

    const now = new Date();
    const toGrant = contacts.filter((tc) => tc.accessGrants.length === 0);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.deathVerification.update({
        where: { id },
        data: {
          status: 'VERIFIED',
          reviewedByUserId: user.id,
          reviewedAt: now,
          reviewNotes: reviewNotes?.trim() || null,
        },
      });

      const grants = await Promise.all(
        toGrant.map((tc) =>
          tx.trustedContactGrant.create({
            data: {
              trustedContactId: tc.id,
              status: 'TRIGGERED',
              triggeredAt: now,
              unlocksAt: new Date(now.getTime() + tc.waitingPeriodDays * 24 * 60 * 60 * 1000),
              reason: `Death verification ${id} approved`,
            },
          }),
        ),
      );

      await tx.auditLog.create({
        data: {
          tenantId: dv.tenantId,
          userId: user.id,
          event: 'death_verification.approved',
          resourceType: 'DeathVerification',
          resourceId: id,
          afterJson: {
            grantsCreated: grants.map((g) => g.id),
            contactsAlreadyGranted: contacts.length - toGrant.length,
          },
        },
      });

      return { updated, grants };
    });

    return NextResponse.json({
      id: result.updated.id,
      status: result.updated.status,
      grantsCreated: result.grants.length,
      contactsAlreadyGranted: contacts.length - toGrant.length,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
