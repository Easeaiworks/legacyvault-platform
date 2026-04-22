import { logger } from './logger';
import { runDeadMansSwitch, runGrantUnlocks } from './jobs/dead-mans-switch';

/**
 * LegacyVault scheduled worker.
 *
 * Two modes:
 *   npm run dev               → runs continuously, waking every minute
 *   npm run run-once -- --once→ executes one full sweep and exits
 *                                 (useful for cron / GitHub Actions)
 *
 * Jobs currently wired:
 *   - dead-man's-switch reminder + trigger scan
 *   - grant unlock sweep (promote TRIGGERED → UNLOCKED once unlocksAt passes)
 *
 * Future jobs (stubs land in separate files in this folder):
 *   - Registry query notifier (notifies principals of new RegistryQuery rows)
 *   - Document S3 sweeper (hard-delete soft-deleted docs after retention)
 *   - OCR worker (Textract)
 *   - Notification delivery via Postmark/Twilio with retries
 */

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 60_000);
const once = process.argv.includes('--once');

async function tick() {
  try {
    await runDeadMansSwitch();
    await runGrantUnlocks();
  } catch (err) {
    logger.error({ err }, 'worker.tick.failed');
  }
}

async function main() {
  logger.info({ once, intervalMs: INTERVAL_MS }, 'worker.start');
  if (once) {
    await tick();
    process.exit(0);
  }

  // Continuous mode
  const handle = setInterval(tick, INTERVAL_MS);
  await tick(); // run immediately on boot

  // Graceful shutdown
  const stop = () => {
    logger.info('worker.stop');
    clearInterval(handle);
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  logger.error({ err }, 'worker.fatal');
  process.exit(1);
});
