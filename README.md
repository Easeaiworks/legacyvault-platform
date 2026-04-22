# LegacyVault Platform

Digital estate planning (LegacyVault), heir-search tooling for estate attorneys (HeirTrace),
and an opt-in Registry — all on one shared data platform.

## Getting started

Prerequisites: Node 20+, Docker, an openssl binary on your PATH.

```bash
./scripts/bootstrap.sh
npm run dev
```

Then:

- Web:   http://localhost:3000
- API:   http://localhost:4000/v1/health
- Minio: http://localhost:9001 (minio / minio12345)
- DB:    postgres://legacyvault:legacyvault@localhost:5432/legacyvault

Log in with `demo@legacyvault.local` (seeded user, AUTH_PROVIDER=local).

## Repo layout

```
legacyvault-platform/
├── apps/
│   ├── api/          NestJS (Fastify) — REST API
│   └── web/          Next.js 15 — marketing + authenticated app
├── packages/
│   ├── database/     Prisma schema, migrations, seed
│   └── shared/       Zod schemas + types shared across apps
├── infrastructure/
│   └── terraform/    AWS infra (KMS, S3, RDS, ECS — multi-region)
├── .github/
│   ├── workflows/    CI (lint, typecheck, test, CodeQL, Trivy)
│   └── CODEOWNERS    Review gates on sensitive paths
├── docs/             Architecture, security, compliance
└── scripts/          Developer bootstrap + one-offs
```

## What's in this scaffold (Session 1)

- Monorepo with Turborepo + TypeScript
- Prisma schema covering every Phase-1 model (User, Principal, Person, Asset, Document, Beneficiary, TrustedContact, Instruction, AuditLog) plus Phase-2 HeirTrace case tables and Phase-3 Registry tables — so the data model never has to shift to add the later products
- NestJS API with:
  - Zod-validated env + strong startup safety rails (no `AUTH_PROVIDER=local` in prod, etc.)
  - Global JWT auth guard + role-based access guard
  - Append-only audit log service + decorator-driven interceptor
  - Field-level AES-256-GCM encryption for PII
  - Pino structured logging with sensitive-field redaction
  - Rate limiting, Helmet, CORS allowlist
  - Example module (Assets) with create/read/update/delete, audited end-to-end
- Next.js 15 app with marketing landing, magic-link login flow, and authenticated app shell
- Docker Compose for local dev (Postgres, Redis, Minio, Mailhog)
- Terraform skeleton for KMS + S3 documents (dev environment)
- GitHub Actions CI: lint, typecheck, tests, CodeQL, Trivy, Terraform validate

## What's explicitly NOT here yet

- WorkOS integration (scaffolded — wire up in Session 2)
- Document upload flow (S3 presigned URL endpoint + frontend uploader — Session 3)
- Dead-man's-switch cron + notification delivery
- Beneficiary conflict-detection engine
- Heir-search integrations
- Stripe billing
- Mobile app

## Key docs

- [Architecture overview](./docs/ARCHITECTURE.md)
- [Security posture](./docs/SECURITY.md)
- [Compliance checklist](./docs/COMPLIANCE.md)
- [Development guide](./docs/DEVELOPMENT.md)
- [Session roadmap](./docs/ROADMAP.md)

## Non-negotiable reminders (please also see docs/COMPLIANCE.md)

- **Get a lawyer to review Terms, Privacy, and the Registry framing before launch.**
  The Registry must be free to consumers; monetize the planning tools instead.
- **SOC 2 Type I is a 6-month runway.** Start engaging auditors by Session 6.
- **Data residency is a feature, not a migration.** Canadian user data stays in ca-central-1.
