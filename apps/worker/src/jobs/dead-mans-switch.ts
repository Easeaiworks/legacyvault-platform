import { prisma } from '@legacyvault/database';
import { logger } from '../logger';

/**
 * Dead-man's-switch orchestration.
 *
 * Schedule (days since lastCheckInAt):
 *   60  — first reminder email
 *   75  — second reminder + push
 *   90  — SMS + notify emergency trusted contacts
 *   90+ — create TRIGGERED grants for CHECK_IN_MISSED trusted contacts,
 *         with unlocksAt = now + tc.waitingPeriodDays
 *
 * Notification delivery is stubbed for now (logs only). Hooking it to
 * Postmark/Twilio is a one-line swap where `notify()` is called.
 */

const REMINDER_1_DAYS = 60;
const REMINDER_2_DAYS = 75;
const TRIGGER_DAYS = 90;

export async function runDeadMansSwitch(): Promise<{ scanned: number; triggered: number }> {
  const now = new Date();
  const scanStart = Date.now();

  const staleThreshold = new Date(now.getTime() - TRIGGER_DAYS * 86_400_000);

  // Find candidate users: active, haven't checked in in 60+ days.
  const candidates = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { lastCheckInAt: null },
        { lastCheckInAt: { lt: new Date(now.getTime() - REMINDER_1_DAYS * 86_400_000) } },
      ],
    },
    select: {
      id: true,
      email: true,
      tenantId: true,
      lastCheckInAt: true,
      firstName: true,
    },
  });

  let triggered = 0;

  for (const user of candidates) {
    const lastSeen = user.lastCheckInAt ?? new Date(0);
    const daysStale = Math.floor((now.getTime() - lastSeen.getTime()) / 86_400_000);

    if (daysStale >= TRIGGER_DAYS) {
      // Check if we've already triggered — don't create duplicate grants.
      const existing = await prisma.trustedContactGrant.findFirst({
        where: {
          trustedContact: { principal: { ownerUserId: user.id } },
          status: { in: ['TRIGGERED', 'UNLOCKED'] },
          reason: 'Check-in missed',
        },
      });
      if (existing) continue;

      const tcs = await prisma.trustedContact.findMany({
        where: {
          principal: { ownerUserId: user.id },
          deletedAt: null,
          triggerType: 'CHECK_IN_MISSED',
        },
      });

      for (const tc of tcs) {
        await prisma.trustedContactGrant.create({
          data: {
            trustedContactId: tc.id,
            status: 'TRIGGERED',
            triggeredAt: now,
            unlocksAt: new Date(now.getTime() + tc.waitingPeriodDays * 86_400_000),
            reason: 'Check-in missed',
          },
        });
        await notify({
          to: user.email,
          subject: 'Your LegacyVault check-in is overdue',
          body: `${user.firstName ?? 'Hi'}, your trusted contact "${tc.id}" has been notified. They will gain access in ${tc.waitingPeriodDays} days unless you check in.`,
        });
      }
      triggered += tcs.length;
      logger.warn({ userId: user.id, tcs: tcs.length, daysStale }, 'dms.triggered');
    } else if (daysStale >= REMINDER_2_DAYS) {
      await notify({
        to: user.email,
        subject: 'Second reminder: please check in with LegacyVault',
        body: `Hi ${user.firstName ?? ''}, it has been ${daysStale} days since your last check-in. In ${TRIGGER_DAYS - daysStale} days your trusted contacts will begin the access-unlock process. Check in now to reset the clock.`,
      });
    } else if (daysStale >= REMINDER_1_DAYS) {
      await notify({
        to: user.email,
        subject: 'Friendly check-in reminder from LegacyVault',
        body: `Hi ${user.firstName ?? ''}, it has been ${daysStale} days since we last heard from you. Please check in when you have a moment.`,
      });
    }
  }

  logger.info(
    { scanned: candidates.length, triggered, elapsedMs: Date.now() - scanStart },
    'dms.scan.complete',
  );
  return { scanned: candidates.length, triggered };
}

/**
 * Separately, unlock grants whose unlocksAt has passed.
 */
export async function runGrantUnlocks(): Promise<{ unlocked: number }> {
  const now = new Date();
  const ready = await prisma.trustedContactGrant.updateMany({
    where: {
      status: 'TRIGGERED',
      unlocksAt: { lte: now },
    },
    data: { status: 'UNLOCKED' },
  });
  if (ready.count > 0) {
    logger.info({ unlocked: ready.count }, 'grants.unlocked');
  }
  return { unlocked: ready.count };
}

/**
 * Notification stub. Replace with Postmark/Twilio client.
 * Writes to logs only today so that tabletop runs don't send real emails.
 */
async function notify(n: { to: string; subject: string; body: string }) {
  logger.info({ to: n.to, subject: n.subject }, 'notify.sent');
  // TODO: await postmark.send({...})
  // TODO: audit log (write AuditLog row here, cross-service)
}
