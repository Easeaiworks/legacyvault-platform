import { NextRequest, NextResponse } from 'next/server';
import { dispatchQueuedJobs } from '@/lib/search/dispatcher';

/**
 * Runs the search-job dispatcher. Called by:
 *   - Vercel Cron (sends GET with x-vercel-cron header)
 *   - Manual operator dispatch (POST with x-lv-worker-token header)
 *
 * Never exposed to end users — no auth token, no run.
 */
async function run(req: NextRequest) {
  const isCron = Boolean(req.headers.get('x-vercel-cron'));
  const workerToken = req.headers.get('x-lv-worker-token');
  const expected = process.env.LV_WORKER_TOKEN;

  const authorized = isCron || (expected && workerToken === expected);
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const maxJobsParam = req.nextUrl.searchParams.get('max');
  const maxJobs = maxJobsParam ? Math.min(100, Math.max(1, Number(maxJobsParam))) : 10;

  const result = await dispatchQueuedJobs(maxJobs);
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;

export const dynamic = 'force-dynamic';
