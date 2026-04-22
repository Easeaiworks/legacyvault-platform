# Development Guide

## Prerequisites

- Node 20+ (use `nvm use` — `.nvmrc` sets the version)
- Docker Desktop (Compose v2)
- openssl (for generating dev keys)

## First-time setup

```bash
./scripts/bootstrap.sh
```

That script:

1. Copies `.env.example` → `.env` and generates random dev keys
2. Runs `npm install`
3. Starts Postgres, Redis, Minio, Mailhog via Docker Compose
4. Runs `prisma migrate` and `prisma db seed`

## Daily workflow

Start everything:

```bash
npm run dev   # starts api + web in parallel via Turbo
```

Run one service only:

```bash
npm run dev -- --filter=@legacyvault/api
npm run dev -- --filter=@legacyvault/web
```

## Database changes

1. Edit `packages/database/prisma/schema.prisma`
2. `cd packages/database && npx prisma migrate dev --name describe_change`
3. Review the generated SQL in `prisma/migrations/<timestamp>_describe_change/`
4. Commit both the schema and the migration

NEVER edit a migration after it has been merged to `main` — create a follow-up
migration instead.

## Adding a new module (example)

```
apps/api/src/modules/documents/
├── documents.module.ts
├── documents.controller.ts
├── documents.service.ts
└── dto/…
```

Every controller MUST either:

- Apply `@Roles(...)` to every handler, or
- Explicitly mark public endpoints with `@Public()`

Every handler that writes state SHOULD have an `@Audit(...)` decorator.

## Code style

- TypeScript strict mode on
- No `any` unless commented with a reason
- Zod schemas live in `@legacyvault/shared`; controllers use `ZodValidationPipe`
- Prettier + ESLint run in CI; format before committing: `npm run format`

## Testing

Unit tests are colocated with modules as `*.spec.ts`. E2E tests live in
`apps/api/test/`. Use the test DB that CI spins up, or `docker compose up
postgres_test` locally (TODO: add this service).

## Troubleshooting

| Symptom                                              | Fix                                                   |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `FIELD_ENCRYPTION_KEY must decode to 32 bytes`       | Regenerate: `openssl rand -base64 32` in `.env`       |
| `AUTH_PROVIDER=local is forbidden in production.`    | That env check is intentional — use WorkOS for prod   |
| Prisma complains about migrations drift              | `npm run db:reset` (destroys local data)              |
| Minio 403 on upload                                  | Use path-style URLs; bucket must exist (create in UI) |
