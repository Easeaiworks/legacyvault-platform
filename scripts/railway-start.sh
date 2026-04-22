#!/bin/sh
# Railway API service entrypoint.
# - Applies Prisma migrations (safe: idempotent; does nothing if up-to-date).
# - If DEMO_SEED_ON_START=true, runs the demo seed (idempotent upserts).
# - Starts the API.

set -e

echo "[start] Applying database migrations..."
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

if [ "$DEMO_SEED_ON_START" = "true" ]; then
  echo "[start] DEMO_SEED_ON_START=true → seeding demo data"
  # Use the compiled seed if available, else fall back to tsx.
  if [ -f packages/database/dist/seed-demo.js ]; then
    ALLOW_DEMO_SEED=true node packages/database/dist/seed-demo.js || true
  else
    ALLOW_DEMO_SEED=true npx tsx packages/database/prisma/seed-demo.ts || true
  fi
fi

echo "[start] Launching API on :${PORT:-4000}"
exec node apps/api/dist/main.js
