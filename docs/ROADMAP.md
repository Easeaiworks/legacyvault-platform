# Session Roadmap

## Session 1 — Foundations (this deliverable)

- [x] Monorepo scaffold with Turborepo + TypeScript
- [x] Prisma schema for all Phase-1/2/3 models
- [x] NestJS API with auth, audit, field encryption
- [x] Next.js web app shell with login + dashboard skeleton
- [x] Docker Compose local infra
- [x] Terraform skeleton (KMS, S3)
- [x] CI/CD (lint, typecheck, test, CodeQL, Trivy, Terraform)
- [x] Docs (architecture, security, compliance, dev guide)

## Session 2 — Auth for real

- [ ] WorkOS AuthKit integration (magic link + SSO + MFA)
- [ ] JWKS verification in `JwtAuthGuard`
- [ ] Session/refresh flow with rotation
- [ ] First-time user → principal bootstrap
- [ ] `/auth/me`, `/auth/logout`, `/auth/sessions` endpoints
- [ ] Protected route middleware in Next.js (replace `AuthGate` client-side check)

## Session 3 — LegacyVault onboarding wizard

- [ ] Onboarding flow: basics → first asset → first document → trusted contact
- [ ] Asset inventory UI (create, edit, delete, categorize)
- [ ] US + Canadian asset-type pickers with jurisdiction defaults
- [ ] Empty-state illustrations + microcopy polish

## Session 4 — Document vault

- [ ] S3 presigned-URL upload flow
- [ ] Client-side envelope encryption before upload
- [ ] OCR worker (Textract) + extracted-metadata panel
- [ ] Document viewer with watermark + download audit

## Session 5 — Beneficiaries + conflict engine

- [ ] Beneficiary designation UI
- [ ] Conflict detection: will vs. 401(k) form vs. policy beneficiary
- [ ] Share-sum validation (must total 100%)
- [ ] "Estate binder" PDF export

## Session 6 — Trusted contacts + dead-man's-switch

- [ ] Trusted contact invite flow
- [ ] Tiered access grant UI
- [ ] Check-in cron + notification service
- [ ] Unlock workflow + waiting period countdown
- [ ] Immutable access log visible to principal

## Session 7 — Hardening

- [ ] Postgres RLS policies enabled on tenant-scoped tables
- [ ] KMS-backed field encryption (replace static key)
- [ ] Stripe subscription billing
- [ ] SOC 2 readiness gap analysis
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Pen test prep

## Phase 2 — HeirTrace (B2B)

Customer discovery in parallel from Session 3+ — don't build in a vacuum.

- [ ] Case management UI
- [ ] Unclaimed-property source integrations (state-by-state)
- [ ] Fuzzy name/address matching engine
- [ ] Document assembly (claim forms, affidavits)
- [ ] Collaboration + billing-hours

## Phase 3 — Registry

- [ ] Identity verification (Stripe Identity or Persona)
- [ ] Consumer opt-in UX
- [ ] Institution KYB + search API
- [ ] Query audit → principal notification loop
