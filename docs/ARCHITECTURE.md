# Architecture Overview

## Products on one platform

LegacyVault (B2C), HeirTrace (B2B), and the Registry (free) share one identity system,
one document vault, one asset data model, and one audit log. Tenancy separation is
enforced in the application layer today and will be reinforced by Postgres Row-Level
Security policies before B2B launch.

## Services

```
  ┌────────────┐    ┌──────────────┐    ┌─────────────┐
  │  Next.js   │───▶│  NestJS API  │───▶│ PostgreSQL  │
  │   (web)    │    │  (apps/api)  │    │    (RDS)    │
  └────────────┘    └──────────────┘    └─────────────┘
                           │
                           ├──▶ S3 (documents, SSE-KMS)
                           ├──▶ Redis (sessions, rate limit, queues)
                           └──▶ KMS (field keys, document keys)
```

The API is stateless Fastify behind an ALB + CloudFront; the web app is deployed on
Vercel or as a standalone container. No single point of failure — every tier scales
horizontally.

## Tenancy model

- Consumer signups create a `Tenant { type: INDIVIDUAL }` with a single `Principal`
  that is also the `User`.
- Family plans create a `Tenant { type: FAMILY }` with multiple `Principals`.
- Law firms/banks create a `Tenant { type: LAW_FIRM | FINANCIAL_INST | FIDUCIARY }`
  with many `User`s across many `HeirSearchCase`s.

Every table with customer data has either a direct `tenant_id` column or belongs to
a row that does. Queries always filter by tenant; later we'll add RLS policies that
enforce this at the database level.

## Data residency

US tenants land in `us-east-1`. Canadian tenants land in `ca-central-1`. The
`tenants.data_residency` column selects the region; the API resolves which KMS key
and S3 bucket to use per-request. Cross-border transfer of Canadian PII is forbidden
without explicit consent.

## Encryption

Three tiers:

1. **At rest (storage)** — RDS + S3 encrypted with service-level SSE-KMS keys.
2. **Field-level** — specific columns (SSN/SIN, account numbers, addresses,
   instruction bodies, OCR text) are encrypted at the application layer before
   hitting the DB. See `apps/api/src/common/crypto/field-crypto.service.ts`.
3. **Per-tenant (B2B)** — law firm customers get their own KMS CMK so their data
   can be cryptographically severed on offboarding.

## Auth

We use an external provider (WorkOS AuthKit) for:

- Consumer magic-link / OTP login
- Enterprise SSO (SAML / OIDC) for HeirTrace customers
- MFA enforcement, including hardware key requirement for platform admins

A local-dev fallback (`AUTH_PROVIDER=local`) lets the stack run without external
dependencies; it is explicitly rejected at startup in production.

## Audit

`audit_logs` is append-only: UPDATE/DELETE are revoked at the database level plus
a trigger enforces it as defense-in-depth. Controllers annotate handlers with the
`@Audit(...)` decorator; an interceptor writes the row after the handler returns.
Sensitive fields are redacted before persistence.

## Observability

Pino structured logs → CloudWatch (prod) / stdout (dev). Sentry for errors, Datadog
for metrics + APM. Every request carries a `x-request-id` that is threaded through
logs and audit rows.

## Roadmap anchor

The schema already includes Phase-2 (HeirTrace cases, unclaimed searches) and Phase-3
(registry entries, queries) tables. This avoids a migration shift once those products
are turned on.
