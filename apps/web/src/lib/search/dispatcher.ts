/**
 * Search dispatcher.
 *
 * Reads QUEUED SearchJob rows from the DB, runs them one at a time, and
 * writes SearchMatch rows for any candidate above REVIEW_THRESHOLD.
 *
 * Called from the Vercel Cron job (nightly) and from the manual dispatch
 * endpoint. Idempotent: retries on FAILED up to 3 attempts before giving up.
 */

import { prisma } from '@/lib/prisma';
import { getSource } from './sources';
import { scoreMatch, Subject, REVIEW_THRESHOLD, AUTO_NOTIFY_THRESHOLD } from './matcher';
import { searchMissingMoney, toCandidate as mmToCandidate } from './scrapers/missingmoney';

const MAX_ATTEMPTS = 3;

export interface DispatchResult {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  matches: number;
}

export async function dispatchQueuedJobs(maxJobs = 10): Promise<DispatchResult> {
  const jobs = await prisma.searchJob.findMany({
    where: {
      OR: [
        { status: 'QUEUED' },
        { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: maxJobs,
  });

  let processed = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  let matches = 0;

  for (const job of jobs) {
    processed++;
    await prisma.searchJob.update({
      where: { id: job.id },
      data: {
        status: 'RUNNING',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    const source = getSource(job.source);
    if (!source || source.status === 'planned') {
      await prisma.searchJob.update({
        where: { id: job.id },
        data: {
          status: 'SKIPPED',
          lastError: source ? 'source not yet available' : 'unknown source',
          completedAt: new Date(),
        },
      });
      skipped++;
      continue;
    }

    try {
      const q = job.queryPayload as {
        subject: Subject;
        firstName: string;
        lastName: string;
        city?: string;
        region?: string;
      };

      let candidates: Array<{ raw: unknown; candidate: ReturnType<typeof mmToCandidate> }> = [];

      if (source.id === 'missingmoney') {
        const raw = await searchMissingMoney({
          firstName: q.firstName,
          lastName: q.lastName,
          city: q.city,
          region: q.region,
        });
        candidates = raw.map((r) => ({ raw: r, candidate: mmToCandidate(r) }));
      } else {
        // Other scrapers not yet implemented — skip.
        await prisma.searchJob.update({
          where: { id: job.id },
          data: {
            status: 'SKIPPED',
            lastError: 'scraper not implemented',
            completedAt: new Date(),
          },
        });
        skipped++;
        continue;
      }

      let created = 0;
      for (const c of candidates) {
        const score = scoreMatch(q.subject, c.candidate);
        if (score.confidence >= REVIEW_THRESHOLD) {
          await prisma.searchMatch.create({
            data: {
              tenantId: job.tenantId,
              jobId: job.id,
              principalId: job.principalId,
              deceasedRelativeId: job.deceasedRelativeId,
              source: source.id,
              matchJson: JSON.parse(JSON.stringify(c.raw)) as object,
              summary: score.reasons.join('; '),
              confidence: score.confidence,
              reviewStatus: score.confidence >= AUTO_NOTIFY_THRESHOLD ? 'UNDER_REVIEW' : 'NEW',
            },
          });
          created++;
        }
      }
      matches += created;

      await prisma.searchJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          resultsCount: candidates.length,
          resultsRawJson: JSON.parse(JSON.stringify(candidates.map((c) => c.raw))),
          completedAt: new Date(),
          lastError: null,
        },
      });
      completed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const nextStatus = job.attempts + 1 >= MAX_ATTEMPTS ? 'FAILED' : 'QUEUED';
      await prisma.searchJob.update({
        where: { id: job.id },
        data: {
          status: nextStatus,
          lastError: msg,
        },
      });
      if (nextStatus === 'FAILED') failed++;
    }
  }

  return { processed, completed, failed, skipped, matches };
}

/**
 * Enqueue searches for every active source that applies to the subject.
 * Used when a Principal adds a deceased relative, or when the quarterly
 * cadence fires for existing subjects.
 */
export async function enqueueForSubject(args: {
  tenantId: string;
  principalId: string;
  deceasedRelativeId?: string;
  subject: Subject;
}) {
  const country = (args.subject.country ?? 'US') as 'US' | 'CA';
  const region = args.subject.region ?? undefined;

  const { sourcesForCountry } = await import('./sources');
  const relevant = sourcesForCountry(country).filter(
    (s) => !s.region || s.region === region,
  );

  const rows = relevant.map((s) => ({
    tenantId: args.tenantId,
    principalId: args.principalId,
    deceasedRelativeId: args.deceasedRelativeId ?? null,
    source: s.id,
    queryPayload: {
      subject: args.subject,
      firstName: args.subject.legalFirstName,
      lastName: args.subject.legalLastName,
      city: args.subject.city ?? undefined,
      region,
    } as object,
    status: 'QUEUED' as const,
  }));

  if (rows.length === 0) return 0;
  const result = await prisma.searchJob.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}
