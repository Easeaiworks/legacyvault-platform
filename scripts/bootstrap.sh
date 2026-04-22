#!/usr/bin/env bash
# One-shot developer bootstrap.
# Usage:  ./scripts/bootstrap.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Checking prerequisites"
command -v node >/dev/null 2>&1 || { echo "node is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  # Generate a dev field encryption key.
  KEY=$(openssl rand -base64 32)
  SECRET=$(openssl rand -base64 64)
  # macOS/BSD sed compatibility
  sed -i.bak "s|FIELD_ENCRYPTION_KEY=.*|FIELD_ENCRYPTION_KEY=${KEY}|" .env
  sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=${SECRET}|" .env
  rm -f .env.bak
  echo "    .env created with generated dev keys"
fi

echo "==> Installing dependencies"
npm install

echo "==> Starting local infrastructure"
docker compose up -d

echo "==> Waiting for Postgres"
until docker compose exec -T postgres pg_isready -U legacyvault >/dev/null 2>&1; do
  sleep 1
done

echo "==> Running database migrations"
npm run db:generate
npm run db:migrate

echo "==> Seeding dev data"
(cd packages/database && npx tsx prisma/seed.ts)

cat <<EOF

LegacyVault is ready.

  API:   http://localhost:4000/v1/health      (run 'npm run dev' in apps/api)
  Web:   http://localhost:3000                (run 'npm run dev' in apps/web)
  Minio: http://localhost:9001                (minio / minio12345)
  DB:    postgres://legacyvault:legacyvault@localhost:5432/legacyvault

Login with: demo@legacyvault.local (AUTH_PROVIDER=local)
EOF
