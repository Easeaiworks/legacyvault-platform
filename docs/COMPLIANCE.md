# Compliance Checklist

This is a working punch-list — not legal advice. Everything here must be reviewed
with qualified counsel before launch.

## Before public beta

- [ ] Incorporate and name the legal entity (LegacyVault Inc. or equivalent)
- [ ] General liability, professional liability (E&O), and cyber liability insurance
- [ ] Retain an attorney with experience in:
  - [ ] US estate planning and probate
  - [ ] US state unclaimed property law (this is where "finder fee" regulation lives)
  - [ ] CCPA / CPRA and the patchwork of state privacy laws
  - [ ] Canadian PIPEDA and Quebec Law 25
- [ ] Terms of Service covering: non-advice disclaimers, arbitration clause, governing
      law, dispute resolution, user-generated content
- [ ] Privacy Policy covering:
  - [ ] US: CCPA/CPRA rights (access, delete, correct, opt-out of sale)
  - [ ] CA: PIPEDA + Quebec Law 25 (cross-border transfer consent)
  - [ ] Children: no service to users under 18 (documented in ToS + UX)
- [ ] Data Processing Agreement template for B2B customers (HeirTrace)
- [ ] Subprocessor list, published publicly, update-before-change
- [ ] Cookie and tracking disclosure (gate analytics behind consent)

## The Registry framing (CRITICAL)

Based on prior legal analysis, the Registry layer has elevated risk:

- [ ] **Registration is FREE for consumers** — no registry fee under any circumstance.
      This is the cleanest path through state UDAP laws, FTC Act §5, and Canadian
      consumer protection statutes.
- [ ] No marketing copy promises matching with unclaimed property
- [ ] No marketing copy implies institutional adoption before it exists
- [ ] Institution access requires KYB verification and an agreement
- [ ] Every query notifies the registered consumer
- [ ] The consumer controls visibility settings, at any time

## Before B2B launch (HeirTrace)

- [ ] SOC 2 Type I audit complete
- [ ] Penetration test complete, remediation closed out
- [ ] Master Service Agreement template (cyber, IP, audit rights)
- [ ] Business Associate Agreement template (if touching HIPAA-covered data)
- [ ] Sub-processor DPA chain documented
- [ ] Data export tool (for customer offboarding)
- [ ] Per-tenant KMS CMK enabled

## Ongoing (quarterly)

- [ ] Review subprocessor list
- [ ] Review IAM least-privilege
- [ ] Rotate field encryption keys (plan + runbook)
- [ ] Run tabletop incident response exercise
- [ ] Refresh penetration test (annual)
- [ ] Accessibility audit (WCAG 2.1 AA)

## Jurisdictional asset-type coverage (already in schema)

US: SSN, ITIN, 401(k), 403(b), 457, IRA (Traditional/Roth/SEP/SIMPLE), pensions,
brokerage, CDs, and every state's unclaimed property program (to be integrated in
HeirTrace).

Canada: SIN, RRSP, RRIF, TFSA, RESP, LIRA, LIF, RDSP, pensions, CPP, OAS,
Bank of Canada unclaimed balances (to be integrated).
