import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

/**
 * Dead-man's-switch state machine.
 *
 * Cadence (MVP default):
 *   Day 0    — user last checked in
 *   Day 60   — first reminder email
 *   Day 75   — second reminder + push notification
 *   Day 90   — SMS + reach out to emergency trusted contacts
 *   Day 90+waitingPeriodDays — trusted contacts gain access
 *
 * The check-in cadence, reminder schedule, and waiting period are all
 * configurable per TrustedContact. The scheduler that actually fires these
 * lives in a separate worker (see apps/worker — Session 3+).
 */
@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);
  private static readonly CHECK_IN_INTERVAL_DAYS = 90;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async checkIn(userId: string) {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastCheckInAt: now },
    });

    // Any in-flight CHECK_IN_MISSED grants should be cancelled.
    const cancelled = await this.prisma.trustedContactGrant.updateMany({
      where: {
        trustedContact: { principal: { ownerUserId: userId } },
        status: { in: ['PENDING', 'TRIGGERED'] },
      },
      data: { status: 'REVOKED', revokedAt: now, reason: 'User checked in' },
    });

    this.logger.log(`User ${userId} checked in (cancelled ${cancelled.count} pending grants)`);
    return { checkedInAt: now, nextDueAt: this.nextDueDate(now) };
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastCheckInAt: true, id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const lastCheckIn = user.lastCheckInAt ?? null;
    const nextDue = lastCheckIn ? this.nextDueDate(lastCheckIn) : null;
    const daysRemaining = nextDue
      ? Math.max(0, Math.ceil((nextDue.getTime() - Date.now()) / 86_400_000))
      : CheckInService.CHECK_IN_INTERVAL_DAYS;

    const activeGrants = await this.prisma.trustedContactGrant.findMany({
      where: {
        trustedContact: { principal: { ownerUserId: userId } },
        status: { in: ['PENDING', 'TRIGGERED'] },
      },
      include: {
        trustedContact: { include: { person: true } },
      },
    });

    return {
      lastCheckInAt: lastCheckIn,
      nextDueAt: nextDue,
      daysUntilDue: daysRemaining,
      status: this.bucketStatus(daysRemaining),
      pendingGrants: activeGrants,
    };
  }

  /**
   * Called by a trusted contact requesting emergency unlock.
   * Starts a waiting-period countdown; the principal is notified (via email/SMS
   * worker — wired in Session 3+) and can cancel within the waiting period.
   */
  async requestEmergencyUnlock(_actorUserId: string, trustedContactId: string, reason?: string) {
    const tc = await this.prisma.trustedContact.findFirst({
      where: { id: trustedContactId, deletedAt: null },
      include: { principal: true },
    });
    if (!tc) throw new NotFoundException('Trusted contact not found');

    const now = new Date();
    const unlocksAt = new Date(now.getTime() + tc.waitingPeriodDays * 86_400_000);

    const grant = await this.prisma.trustedContactGrant.create({
      data: {
        trustedContactId: tc.id,
        status: 'TRIGGERED',
        triggeredAt: now,
        unlocksAt,
        reason: reason ?? 'Emergency unlock requested by trusted contact',
      },
    });

    await this.audit.record({
      tenantId: tc.principal.tenantId,
      event: 'trusted_contact.emergency_unlock_started',
      resourceType: 'TrustedContactGrant',
      resourceId: grant.id,
      afterJson: { unlocksAt, waitingPeriodDays: tc.waitingPeriodDays },
    });

    // TODO (Session 3): enqueue notification to principal (email + SMS).
    return grant;
  }

  /** Called by scheduler when a CHECK_IN_MISSED threshold is crossed. */
  async triggerMissedCheckIn(ownerUserId: string) {
    const tcs = await this.prisma.trustedContact.findMany({
      where: {
        principal: { ownerUserId },
        deletedAt: null,
        triggerType: 'CHECK_IN_MISSED',
      },
    });
    const now = new Date();
    for (const tc of tcs) {
      const unlocksAt = new Date(now.getTime() + tc.waitingPeriodDays * 86_400_000);
      await this.prisma.trustedContactGrant.create({
        data: {
          trustedContactId: tc.id,
          status: 'TRIGGERED',
          triggeredAt: now,
          unlocksAt,
          reason: 'Check-in missed',
        },
      });
    }
    this.logger.warn(`Triggered missed-checkin for user ${ownerUserId} (${tcs.length} contacts)`);
  }

  private nextDueDate(from: Date): Date {
    return new Date(from.getTime() + CheckInService.CHECK_IN_INTERVAL_DAYS * 86_400_000);
  }

  private bucketStatus(daysRemaining: number): 'healthy' | 'due-soon' | 'overdue' {
    if (daysRemaining > 30) return 'healthy';
    if (daysRemaining > 0) return 'due-soon';
    return 'overdue';
  }
}
