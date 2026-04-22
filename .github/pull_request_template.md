# Pull Request

## Summary
<!-- What changed and why. Keep it short. -->

## Checklist
- [ ] Types pass (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] Tests added or updated
- [ ] No secrets, PII, or customer data in code, tests, or commit messages
- [ ] Changes to the audit model are reviewed by security
- [ ] Changes to authentication / authorization are reviewed by security
- [ ] Any new env var is added to `.env.example` **and** `env.validation.ts`

## Security
- [ ] This change does not log sensitive fields (SSN/SIN, account numbers, document contents)
- [ ] Any new external dependency has been reviewed for supply-chain risk
- [ ] Any new endpoint applies `@Roles(...)` or explicit `@Public()`

## Screenshots / demo
<!-- Optional -->
