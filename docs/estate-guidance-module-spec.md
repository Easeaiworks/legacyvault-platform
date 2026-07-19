# LegacyVault — Estate Guidance, Calculators, Providers, and Credential Vault (Spec v3)

**Status:** draft for build
**Replaces:** v2 messaging spec + informal password-storage decision
**Incorporates:** LegacyVault Estate Planning Education Framework (July 2026) + bi-national parity decision + zero-knowledge credential vault decision

---

## 1. What we're building (one paragraph)

Four sub-modules that transform LegacyVault from a workspace for storing estate content into a **guide** for building one — with bi-national coverage across Canada and the United States, jurisdiction-aware from the first click. Users get plain-English essays on what documents they actually need, interactive calculators showing the real cost of dying and the real power of compound savings, a curated directory of estate lawyers and fee-only fiduciary financial planners in their state or province, and a zero-knowledge encrypted vault for the credentials heirs will need to close accounts. All of it wraps into a single **Estate Readiness Score** on the dashboard that gives users one number to reduce as they act.

---

## 2. Product principles

1. **Jurisdiction drives everything.** Every dollar figure, every timeline, every terminology choice, every provider adjusts based on the user's country and state/province. No generic "your probate fee will be roughly…" text.
2. **The WITHOUT/WITH table is our signature UX pattern.** It's the emotional lever that makes people act. We use it on every essential document.
3. **Scenarios beat statistics.** Every guide includes at least one real scenario (car accident, remarriage with old beneficiary, stroke) alongside the concept explanation.
4. **Reserved, not gamified.** Estate planning is not Duolingo. Readiness Score, yes; streaks and badges, no.
5. **Educate; don't advise.** Legal advice and financial advice are regulated speech in both countries. We give plain-English information and refer to professionals for advice.
6. **Zero-knowledge for anything sensitive.** Credential vault, security questions, letter bodies — we design so we can't decrypt, so we can't be compelled to hand over.
7. **Trust before revenue.** No affiliate fees on provider referrals at launch. Ranking by public signals (bar admission verification, NAPFA membership, BBB rating floor, Google review floor) with the methodology published in-app.

---

## 3. Bi-national architecture: jurisdiction as a first-class citizen

### 3.1 The two-level jurisdiction model

**Country level (nav pill switcher — always visible):**
- 🇨🇦 Canada
- 🇺🇸 United States

**Sub-jurisdiction (in-app picker — required for calculators + provider directory):**
- Canada: 13 provinces/territories (ON, BC, AB, QC, MB, SK, NS, NB, NL, PEI, NT, YT, NU)
- US: 50 states + DC + PR

### 3.2 UX pattern

**Landing page:**
- **Persistent flag pill in top-right of nav** — two flags, one selected, one dimmed. Click to switch. Standard SaaS pattern (Airbnb, Netflix, Squarespace).
- **First-visit country picker strip** just below the hero image: *"Where are you planning from?"* with two big flag buttons. Dismisses once chosen; doesn't come back for returning visitors. This overrides any IP geolocation guess we'd otherwise make (unreliable for expats, cross-border commuters).
- If the visitor doesn't pick, we default to `null` and every jurisdiction-dependent piece shows a "Pick your country to see accurate numbers" callout.

**Inside the app:**
- **State/province picker** appears at the top of any calculator or content page that depends on it, with an "Edit residence" pencil icon. Default value = the Principal's `residenceRegion`.
- **On the dashboard**, jurisdiction badge visible at all times ("Ontario, Canada").

### 3.3 Persistence

- **Anonymous visitors:** `localStorage.setItem('lv_country', 'CA'|'US')` + `lv_region`.
- **Logged-in users:** `Principal.residenceCountry` + `Principal.residenceRegion` (both fields already in the schema).
- **Toggle in nav writes to both** stores + issues a soft page refresh so downstream content re-hydrates.

### 3.4 Content-tagging model

Every guide, calculator, checklist item, and provider carries a jurisdiction tag:

- `UNIVERSAL` — applies everywhere (compound interest math, "why you need a will" conceptually)
- `COUNTRY_CA` / `COUNTRY_US` — applies to that country as a whole
- `REGION_CA_ON`, `REGION_US_CA`, etc. — applies only to that province/state

When rendering, we cascade from most-specific to universal:
1. Try `REGION_<country>_<region>` first
2. Fall back to `COUNTRY_<country>`
3. Fall back to `UNIVERSAL`

---

## 4. The four sub-modules

### 4.1 Guides

Plain-English essays on the pieces of a proper estate plan. Content type is Markdown files under `content/guides/<jurisdiction>/<slug>.md` with frontmatter for jurisdiction, category, related-guides, and CTAs.

**Launch guide set (16 total — 8 topics × 2 countries):**

| Slug | Title | Category |
|---|---|---|
| why-you-need-a-will | Why you need a will (and what happens if you don't) | Essential documents |
| power-of-attorney-property | Power of attorney for property: the document that matters most while you're alive | Essential documents |
| power-of-attorney-personal-care | Healthcare directives: the paperwork you never want your family to have to guess about | Essential documents |
| beneficiary-designations | Beneficiary designations: the mistake that gives your ex-spouse your RRSP/401(k) | Essential documents |
| single-income-household-plan | The single-income estate plan | Financial planning |
| how-much-life-insurance | How much life insurance you actually need (the DIME method) | Financial planning |
| what-200-a-month-becomes | What $200 a month actually becomes | Financial planning |
| digital-goodbye-checklist | The digital goodbye: closing accounts, unlocking devices, and everything else | Digital |
| how-to-hire-a-lawyer | How to hire an estate lawyer without getting fleeced | Practical |

Each guide, in its most specific jurisdiction variant, includes:
- **A WITHOUT/WITH table** at the top (see §7)
- **A scenario** in italics halfway through (borrowed structure from your framework doc)
- **"What to do next in LegacyVault"** — deep link to the relevant module (asset inventory, beneficiaries, funeral wishes, etc.)
- **"When to hire a professional"** — link to the Provider Directory filtered to their region

**Voice:** warm, direct, non-euphemistic. "Dies" not "passes away." "Your family will struggle" not "financial hardship may occur." Written to be read by real humans, not law students.

**Length target:** 800–1,500 words per guide. Under 3-minute read.

**Regulatory footer on every guide:**
> *LegacyVault does not provide legal, financial, or tax advice. This is educational content, not a substitute for advice from a qualified attorney, financial planner, or accountant licensed in your jurisdiction. Consult a professional for advice specific to your situation.*

### 4.2 Calculators

Free to use for anyone; save-and-track requires the paid tier.

**Four calculators at launch:**

**a) Compound Savings Visualizer** — universal (no jurisdiction dependency)
- Inputs: monthly contribution, current age, retirement age, expected annual return.
- Defaults offer three scenarios: Conservative 4%, Balanced 6%, Growth 8%.
- Output: growth line chart, total contributions vs. total value, "at retirement you'll have $X."
- The static table from the framework doc ($100/mo → $200/mo → $300/mo … over 10/20/30/40 years) sits below the interactive tool as the sharable / screenshottable version.

**b) Cost of Dying Estimator** — jurisdiction-driven (the "why now" calculator)
- Inputs: country → state/province, estate value, family situation (spouse? kids? common-law?).
- Outputs: probate fees (with the real formula — Ontario 1.5% over $50k, BC ~1.4%, Alberta max ~$525, Quebec $0 for notarial, state-by-state for US), legal fees estimate, executor compensation, final tax return costs, total immediate cost.
- One-line takeaway at the top: *"Your family will face approximately $47,300 before receiving a dollar of inheritance."*
- CTA: "Here's how to reduce it" → deep link to relevant guides.

**c) Life Insurance Need Estimator** — universal math, jurisdiction-flavored copy
- DIME method: Debt + Income (× years to replace) + Mortgage + Education.
- Inputs: annual income, spouse income, mortgage balance, kids' ages, existing coverage.
- Output: recommended coverage range with breakdown of where each dollar goes.

**d) Beneficiary Audit** — reuses existing `beneficiary-conflicts` engine
- No new user input required. Reads existing beneficiaries + assets from the user's vault.
- Flags: accounts naming "my estate" as beneficiary, accounts with no beneficiary, retirement accounts where spouse rollover would apply but isn't set up, out-of-date designations post-marriage/divorce (if we know those dates).
- Delivers as a Score card on the dashboard: "3 issues to review" with drill-down.

**Regulatory language on every calculator:**
> *Educational estimate only. Assumes typical scenarios; your actual costs may vary based on jurisdiction, family circumstances, and professional fees. Not tax or financial advice.*

### 4.3 Provider Directory

Curated directory of estate lawyers, fee-only fiduciary financial planners, will services, and life-insurance advisors — in both countries.

**Launch set: 40 providers total** (up from 20 in the previous spec, to reflect bi-national coverage):

- 10 estate lawyers in Canada (2 each in ON, BC, AB, QC + 2 other)
- 10 estate attorneys in US (CA, TX, FL, NY, IL, and other major metros)
- 8 fee-only fiduciary financial planners (4 CA, 4 US)
- 6 will services (Willful.ca, Epilogue.co, Notary services for QC; Trust & Will, FreeWill, Nolo for US)
- 6 life insurance advisors / brokers (mix)

**Vetting methodology (published as a page in the directory):**

| Provider type | We look at |
|---|---|
| Lawyer | Active bar admission (verified via provincial law society or state bar registry, with lookup link on every profile) · Estate-planning as a stated specialty · 5+ years experience |
| Financial planner | Fee-only status verified via NAPFA (US) or Advocis / FPSC (Canada) · Fiduciary standard confirmed · CFP or equivalent designation · No commission-based compensation model |
| Will service | BBB rating A- or higher (US) / no Consumer Reports flags · Google review floor of 4.2 · Transparent pricing on site · Available in the user's jurisdiction |
| Insurance advisor | Independent (not captive) · Licensed in the user's jurisdiction · Fee disclosure available |

**No affiliate fees at launch.** All links go through a `/go/{providerId}?ref=lv-directory` redirect that logs the click for our own analytics only. Clean, non-affiliate outbound links.

**Directory pages:**
- `/guides/find-a-lawyer/[region]` — filter by need (planning, dispute, complex estate, small estate)
- `/guides/find-a-financial-planner/[region]` — fee-only fiduciaries only
- `/guides/find-a-will-service/[country]` — online options

### 4.4 Credential Vault (Option A — zero-knowledge)

**Purpose:** let users store login credentials and security-question answers so heirs can close accounts, unlock devices, cancel subscriptions, access banking — without LegacyVault ever seeing the plaintext.

**Architecture:**

1. **User creates a Vault Password** on first use. This is separate from their LegacyVault account password. We show clear copy: *"This is the only password we can never help you recover. Print your recovery code."*
2. **Encryption key derivation** in the browser using Argon2id (memory-hard KDF).
   - `key = Argon2id(vaultPassword + userSalt, {timeCost: 3, memoryCost: 65536, parallelism: 4})`
   - `userSalt` stored per-user on the server; not itself a secret, but pairs with the password to make offline attacks harder.
3. **Credentials encrypted client-side** with AES-256-GCM using the derived key. Ciphertext + IV + auth tag uploaded to server. Server never sees the vault password or the derived key.
4. **Server stores only** ciphertext, IV, auth tag, KDF parameters (salt + timing/memory settings for future re-derive if we upgrade the KDF), and metadata (kind: LOGIN | SECURITY_ANSWER | RECOVERY_CODE, label, provider, updatedAt).
5. **Recovery for the living user** — a printed 24-word recovery code (BIP-39 wordlist) generated at vault creation. If they lose their vault password, they enter the recovery code to derive the key. The recovery code should be stored physically with the will.
6. **Recovery for heirs (executor unlock)** — Shamir Secret Sharing splits the vault key into m-of-n shares. The user distributes shares to trusted contacts (each gets one share in a sealed envelope or via encrypted export). On death + verification, any m contacts can combine their shares to unlock the vault. Waiting period + trusted-contact attestation required, per the existing dead-man's-switch pattern.

**Threat model that this defeats:**
- LegacyVault database breach → attackers get ciphertext only, no key material to decrypt.
- LegacyVault subpoena → we can produce ciphertext; we cannot produce plaintext.
- Insider risk → same as above.

**Threat model that this does NOT defeat:**
- User loses both vault password AND recovery code AND fewer than m Shamir shares are recoverable → data is unrecoverable. This is the tradeoff of true zero-knowledge. We tell them this clearly at setup.

**Content model:**

```
CredentialEntry {
  id, tenantId, principalId,
  kind: LOGIN | SECURITY_ANSWER | RECOVERY_CODE | SEED_PHRASE | TOTP_SEED,
  label,             // "Netflix", "Apple ID", "Gmail 2FA seed"
  provider,          // "Netflix"
  ciphertextBase64,  // AES-256-GCM ciphertext (contains username, password, notes, security questions)
  ivBase64,
  authTagBase64,
  kdfSalt, kdfIterations, kdfMemory, kdfParallelism,
  intendedAction: SAME as DigitalAsset (CANCEL | TRANSFER | MEMORIALIZE | DELETE | PRESERVE),
  linkedDigitalAssetId,  // optional link to existing DigitalAsset entry (e.g., the "Netflix" record already exists)
  createdAt, updatedAt, deletedAt
}
```

**UX:**
- One-time onboarding flow: create Vault Password → generate recovery code → *print or save this now* → confirm they've stored it → done.
- Every subsequent access: single Vault Password prompt (session-cached in memory for 15 min, never persisted).
- Add credential: form + save. All encryption happens client-side; only ciphertext hits the wire.

**Security engineering effort:** ~2 weeks + external security review before we let real users store real passwords. This is not a rushed feature.

**Deferred:** biometric unlock (WebAuthn), auto-fill browser extension, family shared vault. All Phase 2.

---

## 5. Estate Readiness Score

The consolidating dashboard metric — replaces the module-specific completion percentages (funeral wishes at 100%, etc.) with one number.

**Scoring model (0–100):**

| Category | Weight | Measured by |
|---|---|---|
| Will | 20 | Has a Will document uploaded? Signed? Dated in last 5 years? |
| POA for property | 15 | Has a POA for Property/Financial document? Dated in last 5 years? |
| POA for personal care | 10 | Has a POA for Personal Care/Healthcare Directive? Dated in last 5 years? |
| Beneficiary designations | 15 | Beneficiary Audit finds 0 issues → full points; scaled down by issues |
| Asset inventory | 10 | ≥ 5 assets logged with values → full points; scaled by count and completeness |
| Trusted contacts | 5 | At least 1 trusted contact set up |
| Funeral wishes | 5 | Existing completionPercentage |
| Digital goodbye | 5 | ≥ 5 digital assets with intended actions |
| Credential vault | 5 | Vault initialized + at least 3 credentials stored (or user has explicitly opted out) |
| Messages | 5 | At least 1 message sealed (encouraged, not required) |
| Life insurance | 5 | Has a life insurance policy logged as an asset |

Displayed as a large number on the dashboard with a "5 next steps to raise your score" list beneath. Each step deep-links to the relevant flow. Updates in real-time as the user acts.

**Copy tone:** *"Your score is 62 out of 100. Here's what's missing:"* — never scolding, always actionable.

---

## 6. First 30 Days after a Death — Executor Checklist

New module for the family *of* the deceased, not the planner. Complements everything else.

**Content type:** a jurisdiction-tagged checklist rendered as a printable, shareable page. Available:
- Publicly at `/guides/first-30-days/[country]`
- Inside the app at `/app/executor-mode` (for executors linked to a deceased principal)

**Sections:**
- **First 24 hours** — funeral home selected, immediate family notified, secure the residence
- **First week** — obtain 10–15 death certificates, notify employer, life insurance claims initiated, freeze credit cards, initial Social Insurance Number / Social Security Administration notice
- **First 30 days** — probate application (if needed), CRA/IRS final-return prep started, benefit claims (CPP/OAS survivor benefits, Social Security), all account holders notified, subscriptions cancelled
- **First 90 days** — property maintenance decisions, business succession, digital-account closures via memorial pages / deletion requests

Each item links to the *legal or financial process* it triggers, plus a directory link when a professional is genuinely needed.

---

## 7. WITHOUT/WITH table — a first-class UI component

Reused across every essential-document guide. Built as `<WithoutWithTable />` component.

```
┌──────────────────┬─────────────────────────┬─────────────────────────┐
│                  │ WITHOUT this document   │ WITH this document      │
├──────────────────┼─────────────────────────┼─────────────────────────┤
│ What happens     │ ...                     │ ...                     │
│ Estimated cost   │ $10,000–$50,000+        │ $500–$2,500             │
│ Timeline         │ 12–24 months            │ 3–9 months              │
└──────────────────┴─────────────────────────┴─────────────────────────┘
```

Design details:
- Left column red-tinted (warning border), right column green-tinted (calm border)
- Numbers pulled from jurisdiction-tagged content (Ontario vs. Alberta will show different probate fees)
- Mobile: stacks to two columns then rows collapse to accordion

---

## 8. Data model additions

### 8.1 Guide

```prisma
model Guide {
  id            String   @id @default(uuid())
  slug          String   // "why-you-need-a-will"
  jurisdictionScope String // "UNIVERSAL" | "COUNTRY_CA" | "COUNTRY_US" | "REGION_CA_ON" ...
  country       String?  @db.Char(2) // null for universal
  region        String?  @db.VarChar(8)
  category      String   // "ESSENTIAL_DOCUMENTS" | "FINANCIAL" | "DIGITAL" | "PRACTICAL"
  title         String
  subtitle      String?
  bodyMarkdown  String   @db.Text
  readTimeMinutes Int
  publishedAt   DateTime?
  updatedAt     DateTime @updatedAt

  @@unique([slug, jurisdictionScope])
  @@index([category, publishedAt])
  @@index([country, region])
}
```

### 8.2 Provider

```prisma
enum ProviderKind { LAWYER FINANCIAL_ADVISOR WILL_SERVICE INSURANCE_ADVISOR }
enum FeeModel { HOURLY FLAT AUM_PCT COMMISSION MIXED }

model Provider {
  id              String       @id @default(uuid())
  kind            ProviderKind
  displayName     String
  firmName        String?
  credentialsList String[]     // ["JD", "CFP", "TEP"]
  specializesIn   String[]     // ["small_estate", "high_net_worth", "blended_family"]
  country         String       @db.Char(2)
  regions         String[]     // ["ON", "BC"] — provinces/states where licensed
  feeModel        FeeModel?
  feeRangeMin     Int?         // in cents
  feeRangeMax     Int?         // in cents
  websiteUrl      String
  phone           String?
  email           String?
  isFiduciary     Boolean      @default(false)
  isFeeOnly       Boolean      @default(false)
  vettingSourcesJson Json      // {barAdmission: {url, verifiedAt}, bbb: {rating, verifiedAt}, ...}
  discoveryPriority Int        @default(0)
  publishedAt     DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([kind, country, publishedAt])
  @@index([country, regions])
}
```

### 8.3 Credential Vault

```prisma
enum CredentialKind {
  LOGIN
  SECURITY_ANSWER
  RECOVERY_CODE
  SEED_PHRASE
  TOTP_SEED
}

model VaultConfig {
  principalId       String   @id @db.Uuid
  kdfSalt           String
  kdfIterations     Int      @default(3)
  kdfMemory         Int      @default(65536)
  kdfParallelism    Int      @default(4)
  recoveryCodeSha256 String  // for verifying user enters correct recovery code (SHA-256 of code + salt, not the code itself)
  shamirThreshold   Int?     // m in m-of-n
  shamirShareCount  Int?     // n
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  principal Principal @relation(fields: [principalId], references: [id], onDelete: Cascade)
}

model CredentialEntry {
  id              String         @id @default(uuid())
  tenantId        String
  principalId     String
  kind            CredentialKind
  label           String
  provider        String?
  ciphertextBase64 String
  ivBase64        String
  authTagBase64   String
  intendedAction  DigitalAssetAction @default(UNCERTAIN)
  linkedDigitalAssetId String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  deletedAt       DateTime?

  @@index([tenantId, principalId, kind])
}
```

### 8.4 Estate Readiness Score

Computed on-demand via a Prisma query over the user's existing data. No new table; it's a derived value.

### 8.5 Estate Readiness Score Snapshot (optional, for trend graphs)

```prisma
model ReadinessScoreSnapshot {
  id           String   @id @default(uuid())
  principalId  String
  score        Int      // 0-100
  breakdownJson Json    // per-category scores
  computedAt   DateTime @default(now())

  @@index([principalId, computedAt])
}
```

---

## 9. Regulatory guardrails (non-negotiable)

1. **Every guide, calculator, and directory page** carries the disclaimer footer.
2. **Cost projections** always show three scenarios (conservative/balanced/growth) so we never imply a single number is a guarantee.
3. **Provider profiles** show source of verification with links out (e.g., "Bar admission verified via Law Society of Ontario on [date]").
4. **No affiliate arrangements or paid placements at launch.** When we add them post-launch, they will be labeled `SPONSORED` in a legible badge, per FTC / Competition Bureau guidelines.
5. **Not a law firm. Not a financial advisor.** Prominently, on every advisory page.
6. **US TCPA / CAN-SPAM compliance** for any recipient email delivery (already covered by existing patterns in Messages module).

---

## 10. Content strategy

**Who writes:**
- I draft all guides, jurisdiction-specific variants included.
- Your existing reviewer (the Canadian estate lawyer contact) reviews the Canadian variants before publication.
- **You need to find a US-jurisdiction estate attorney reviewer** for the US variants. Until then, US variants are drafted from public, citable sources (Uniform Probate Code, IRS Publication 559, state bar association materials) with **every dollar figure and legal claim carrying a source citation footnote**. These launch as "labeled draft, currently in review" until a US attorney signs off.

**Sourcing for jurisdiction-specific dollar figures:**
- Canada: your framework doc + provincial law society schedules + Statistics Canada + CRA
- US: state bar association fee schedules + IRS Pub 559 + State-specific probate court websites + Uniform Probate Code + Trust & Will's published research

**Update cadence:**
- Every guide flagged for annual review.
- Dollar figures that reference tax thresholds (US federal estate tax exemption, TFSA contribution limit, RRSP dollar limit) auto-updated from a central `TaxConfig` table so we don't drift.

---

## 11. Build order

Total: ~28 engineer-days for the full advisory + calculator + directory + readiness score. Credential Vault is separate at ~15 days (needs security review).

**Phase 1 — Foundation (Week 1)**
- Jurisdiction picker + nav pill + first-visit strip (2d)
- Guide data model + Markdown-file pipeline (1.5d)
- Cost of Dying calculator with jurisdiction-driven formulas (2d)

**Phase 2 — Content push (Week 2–3)**
- 8 universal + Canadian guides (4d — draft time is content, engineering is minimal)
- 8 US guides (4d — same, drafted with source citations)
- WithoutWithTable component (0.5d)
- Provider directory schema + 40 seed providers (2d)

**Phase 3 — Calculators + Score (Week 4)**
- Compound Savings visualizer (1.5d)
- Life Insurance Need estimator (1.5d)
- Beneficiary Audit (reuses existing conflict engine, 1d)
- Estate Readiness Score dashboard (2d)
- First 30 Days executor checklist (1d)

**Phase 4 — Credential Vault (Week 5–7)**
- Zero-knowledge encryption in browser (WebCrypto, Argon2id, AES-256-GCM) (5d)
- Recovery code flow (BIP-39 wordlist, printable page) (2d)
- Shamir secret sharing for executor unlock (3d)
- Vault UI (add credential, list, decrypt-on-view) (3d)
- External security review + fixes (2d)

**Parallel visual design work (any week)** — refresh app aesthetics per competitor research §13.

---

## 12. Decisions confirmed

- ✅ **Credential Vault architecture: Option A** (zero-knowledge, Argon2id, AES-256-GCM, Shamir recovery)
- ✅ **Content authorship:** I draft; user's reviewer edits Canadian; new US reviewer needed for US variants
- ✅ **Calculators:** free to use publicly; save-and-track requires paid tier
- ✅ **Provider directory:** no affiliate fees at launch; ranking by public signals with published methodology
- ✅ **Bi-national parity from day one** — Canada and US equal weight
- ✅ **Jurisdiction drives every dollar figure and data point**
- ✅ **Nav pill + hero first-visit strip** as the flag-toggle UX pattern

## 13. Decisions still open

1. **US estate-attorney reviewer** — I'll draft US content with citations; you find the reviewer before the US guides go public. Suggested places to look: your existing reviewer's US counterpart, ACTEC members, state bar-referral services.
2. **Visual identity refresh** — this spec assumes we adjust the app's look and feel after benchmarking US competitors. See separate research document.
3. **Whether to launch the Credential Vault at MVP or delay until v2** — my rec: delay. Ship guides + calculators + directory + readiness score first. Credential Vault is a 2-week feature that needs a security review; it can slip a month without hurting the launch value.

## 14. What's not in this MVP

- AI-generated legal Q&A (too much liability, deferred)
- Chatbot support (deferred)
- User reviews of providers (moderation complexity, deferred)
- Multi-language beyond English (deferred; Quebec French is a strong candidate for v2)
- Live provider booking / calendaring (deferred; MVP is outbound referral only)
- Executor "power of attorney to LegacyVault" delegation for handling account closures (interesting but complex, v2+)
