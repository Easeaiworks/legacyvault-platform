# LegacyVault — Legacy Modules (MVP Spec v2)

**Status:** draft for review
**Author:** LegacyVault team
**Scope:** audio messages + rendered playback + recipe vault + funeral wishes + digital goodbye
**Replaces:** v1 (video-first) after product direction call

---

## 1. What we're building (one paragraph)

Four premium modules that sit inside LegacyVault and transform it from an estate-planning workspace into a true **legacy platform** — the place someone goes to make sure the right people get the right things (physical, financial, and emotional) when the time comes. None of these are video-recording modules. Users record **audio** (optionally with a stylized animated-card playback that makes the message feel like a Hallmark keepsake), write **recipes** with the stories behind them, spell out **funeral and milestone wishes**, and build a **structured digital goodbye** so their family isn't left scrambling to cancel 40 subscriptions and unlock a dead phone.

Each module can be sold as a standalone add-on or bundled. The animated-card playback is itself an upcharge on top of Messages.

---

## 2. Product principles

1. **Audio over video, always.** Lower shame barrier, 20× cheaper storage, higher re-listen rate, friendlier to older users.
2. **Beauty without cheese.** The rendered-card playback has to feel like heirloom calligraphy, not a Canva template. We will iterate on the visuals until that bar is met.
3. **No surprise deliveries.** Recipients always get a heads-up and can pause.
4. **Subscription lapse never deletes legacy.** Lapsed users can't create new content but everything already sealed stays on schedule.
5. **Storage survives us.** Documented escrow + open-source decryption tool so the user's content is not held hostage by LegacyVault's business continuity.
6. **AI comes later, deliberately.** Real recordings first. Synthetic "conversations with the deceased" is a later decision with real ethical weight, not a launch feature.

---

## 3. The four modules at a glance

| Module | What it stores | Primary UX | Where it shines |
|---|---|---|---|
| **Messages** | Audio + written letters | Record or type → pick recipient → pick trigger | Grandparent leaves 30 birthday messages for grandchild covering ages 5–40 |
| **Rendered Playback** *(add-on to Messages)* | Styled visual layer over existing audio | Toggle at seal time | Audio plays while the transcript appears as handwritten text on a warm card — think holiday letter with gold-dust shimmer |
| **Recipe Vault** | Structured recipes + optional audio story | Enter ingredients/steps → optional audio walkthrough → assign heir | Mom's pierogi recipe with the 45-second voice memo: *"don't skip the extra egg yolk, Grandma fought with your aunt about it for 20 years"* |
| **Funeral & Event Wishes** | Preferences for end-of-life events | Guided form (service type, music, readings, obituary draft, dietary notes for gathering) | Spares the family the torture of guessing |
| **Digital Goodbye** | Structured list of digital life to wind down | Category-by-category checklist | Passwords, subscriptions to cancel, devices to wipe, pet care instructions, social-media-deactivation preferences |

---

## 4. Data model (Prisma additions)

Five new tables. All tenant-scoped. All bodies/notes go through existing `FieldCryptoService`.

### 4.1 Messages

```prisma
enum MessageMediaType {
  AUDIO
  LETTER          // written text
}

enum MessagePlaybackStyle {
  AUDIO_ONLY      // plain audio player (included)
  RENDERED_CARD   // audio + animated transcript on styled card (add-on)
}

enum RenderedCardTheme {
  PARCHMENT_WARM      // cream background, ink handwriting, soft candle-lit feel
  GOLD_DUST           // deep navy background, hand-lettered script, gold particles
  GARDEN_LETTER       // botanical border, natural paper, flowing cursive
  FAMILY_ALBUM        // vintage photo-corner style, warm sepia tones
  MODERN_MINIMAL      // clean off-white, elegant serif, no effects — for users who hate ornament
}

enum MessageStatus {
  DRAFT
  SEALED
  RELEASED
  REVOKED
  ARCHIVED
}

enum TriggerKind {
  TIME_ABSOLUTE
  TIME_RELATIVE_TO_DOB
  LIFE_EVENT
  DEATH_PLUS
}

enum TriggerEvent {
  GRADUATION
  MARRIAGE
  FIRST_CHILD
  DIVORCE
  JOB_LOSS
  DIAGNOSIS
  GRIEF_FIRST_YEAR
  CUSTOM
}

model Message {
  id                String               @id @default(uuid())
  tenantId          String
  principalId       String
  title             String
  mediaType         MessageMediaType
  mediaKey          String?              // Supabase Storage object key for audio
  mediaDurationSec  Int?
  mediaSizeBytes    BigInt?

  bodyCipher        Bytes?               // for LETTER or typed fallback
  transcriptCipher  Bytes?               // Whisper-generated, encrypted

  playbackStyle     MessagePlaybackStyle @default(AUDIO_ONLY)
  cardTheme         RenderedCardTheme?   // only used if playbackStyle = RENDERED_CARD

  promptId          String?
  status            MessageStatus        @default(DRAFT)
  sealedAt          DateTime?
  revokedAt         DateTime?

  recipients        MessageRecipient[]
  triggers          MessageTrigger[]

  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  @@index([tenantId, principalId, status])
}

model MessageRecipient {
  id          String   @id @default(uuid())
  messageId   String
  personId    String
  deliveredAt DateTime?
  viewedAt    DateTime?
  viewCount   Int      @default(0)
  pausedAt    DateTime?

  @@unique([messageId, personId])
}

model MessageTrigger {
  id                String        @id @default(uuid())
  messageId         String
  kind              TriggerKind
  releaseAt         DateTime?
  ageYears          Int?
  eventKind         TriggerEvent?
  daysAfterDeath    Int?
  attestationPolicy Json?
  firedAt           DateTime?
}

model MessagePrompt {
  id        String  @id @default(uuid())
  tenantId  String?
  category  String  // STORY | VALUES | APOLOGY | MILESTONE | RECIPE_STORY | HEIRLOOM | FUNERAL
  title     String
  body      String
  isSystem  Boolean @default(false)
}
```

### 4.2 Recipes

```prisma
model Recipe {
  id                String      @id @default(uuid())
  tenantId          String
  principalId       String
  title             String      // "Mom's Pierogi"
  originStory       String?     // short text — "this came from Grandma Elżbieta, who claimed she stole it from a neighbor in 1952"
  originStoryCipher Bytes?      // encrypted version if user wants it private
  cuisineTags       String[]
  servings          Int?
  prepTimeMinutes   Int?
  cookTimeMinutes   Int?

  // ingredients & steps stored as structured JSON
  ingredients       Json        // [{name, quantity, unit, notes}]
  steps             Json        // [{order, text, imageKey?, tipText?}]

  // optional audio walkthrough
  audioKey          String?
  audioDurationSec  Int?

  inheritors        RecipeInheritor[]

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([tenantId, principalId])
}

model RecipeInheritor {
  id        String  @id @default(uuid())
  recipeId  String
  personId  String
  @@unique([recipeId, personId])
}
```

### 4.3 Funeral & Event Wishes

```prisma
model FuneralWishes {
  id                      String   @id @default(uuid())
  tenantId                String
  principalId             String   @unique  // one wishes doc per principal

  // service preferences
  serviceType             String?  // BURIAL | CREMATION | GREEN_BURIAL | NO_SERVICE | OTHER
  serviceNotes            String?
  locationPreference      String?
  religiousOrSecular      String?
  officiantPreference     String?

  // media
  musicSelections         Json     // [{title, artist, when: "processional" | "recessional" | "reception"}]
  readingsSelections      Json     // [{text, source, readerPreferenceName?}]

  // attire & gathering
  attireNotes             String?
  gatheringNotes          String?  // "reception at my house, not a restaurant"
  cateringOrDietaryNotes  String?

  // obituary
  obituaryDraft           String?  // optional self-written obituary
  obituaryDraftCipher     Bytes?

  // who handles what
  executorInstructions    String?
  financialResponsibility String?  // who is paying

  updatedAt               DateTime @updatedAt
}
```

### 4.4 Digital Goodbye

```prisma
enum DigitalAssetKind {
  ACCOUNT_LOGIN         // a website or service
  SUBSCRIPTION          // a recurring charge
  DEVICE                // phone, laptop, tablet, smart home
  DOMAIN_NAME
  CRYPTO_WALLET
  SOCIAL_MEDIA          // separate from ACCOUNT because we ask for shutdown preferences
  PET_CARE_INSTRUCTIONS
  HOUSEHOLD_INSTRUCTIONS // keys, security codes, thermostat quirks, where the well shutoff is
  OTHER
}

enum DigitalAssetAction {
  CANCEL                // terminate the subscription/account
  TRANSFER              // transfer to someone
  MEMORIALIZE           // e.g., Facebook memorial profile
  DELETE                // fully delete all data
  PRESERVE              // keep as-is for family
  UNCERTAIN             // user wants this decided later
}

model DigitalAsset {
  id              String              @id @default(uuid())
  tenantId        String
  principalId     String
  kind            DigitalAssetKind
  label           String              // "Netflix family plan"
  provider        String?             // "Netflix"
  identifier      String?             // email or username
  // Note: we deliberately do NOT store passwords here — we link to the user's
  // password manager (1Password, Bitwarden, etc.) or tell the executor to find
  // them there. See §8 for the rationale.
  passwordHint    String?             // "in 1Password, vault: Family"
  intendedAction  DigitalAssetAction
  preferredHeir   String?             // personId if TRANSFER
  instructions    String?             // freeform — "turn off auto-renewal, then cancel"
  instructionsCipher Bytes?
  priorityOrder   Int                 @default(0)  // user can reorder

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([tenantId, principalId, kind])
}
```

---

## 5. The rendered-card playback (the Hallmark moment)

This is the feature that earns us the premium price.

**How it works technically:**

1. User records audio normally.
2. On seal, we call Whisper's word-level timestamp API and store `[{word, startMs, endMs}]` in the transcript.
3. At playback time, a React component renders the transcript with each word (or phrase) appearing in sync with the audio. The visual treatment is controlled by `cardTheme`.
4. Underneath, the audio element is plain `<audio>` — playback stays accessible (screen-readers get transcript, low-bandwidth users can just listen).

**How the five themes actually differ:**

- **Parchment Warm** — cream paper texture, ink handwriting font (Homemade Apple or custom), single candle-flicker light source that subtly moves, no particles.
- **Gold Dust** — navy velvet background, hand-lettered script, gold foil particles drift diagonally at low opacity. This is the "Disney magic" one.
- **Garden Letter** — botanical border (seasonally varying), natural paper grain, flowing cursive, faint garden-at-dusk warm light.
- **Family Album** — vintage photo-corner layout, sepia tint, the words appear as if being typed into the margin of an old photograph.
- **Modern Minimal** — no effects. Clean off-white, elegant serif, words ease in and out. For people who hate ornament.

**What we need to get right in visual iteration:**

- Font selection. "Handwriting" fonts are 95% cheesy. We need two or three we've custom-licensed or that reach the bar (Baskerville-like formal scripts, or commission a real handwriting style).
- Motion timing. Words appearing one-by-one in strict sync looks mechanical. Appearing in phrase-clumps with subtle easing feels natural.
- Particle density. Gold dust at 10% opacity is romantic; at 40% opacity it's a screen saver.
- Audio ducking. Slight background audio (distant piano chord, soft room tone) under the user's voice — *if* the user opts in — sells the "keepsake" feel. But it has to be tasteful.

**Honest risk:** this is 30% engineering and 70% design craft. If we launch before the visuals are right, the whole feature embarrasses the brand. **My recommendation is a separate design prototype phase** — 2–3 iterations with real users' audio (yours, mine, a few test friends) reviewing samples — before we ship. I'll build the engine as part of MVP but flag visual approval as a distinct gate.

---

## 6. UX skeleton for each module

I'll spare the ASCII diagrams here and commit UI sketches separately. High-level:

- **Messages list** (`/app/messages`) — drafts at top, sealed-scheduled grouped by recipient, released below.
- **Record flow** (`/app/messages/new`) — prompt picker → audio record → review/trim → pick recipient → pick trigger → pick theme (if opted into rendered playback) → seal.
- **Recipes list** (`/app/recipes`) — grid of cards with cover image, cuisine tag, inheritor chip.
- **Recipe detail** — ingredients, steps, origin story, audio walkthrough, inheritor assignment.
- **Funeral wishes** (`/app/wishes`) — single long-form guided page with autosave, progress indicator ("you've filled in 7 of 12 sections").
- **Digital goodbye** (`/app/digital-goodbye`) — category sidebar, spreadsheet-like table in the main pane, bulk import from CSV option.

All four modules share the same top-nav under a **"Legacy"** heading so they feel like one coherent experience, not four products.

---

## 7. Storage economics (recalculated — audio only)

Audio at 96 kbps runs about ~0.7 MB per minute, so a 10-minute message is ~7 MB. Dramatically cheaper than video.

| Tier | Price (target) | What's included |
|---|---|---|
| **Registry** | $0 | Registry only, no modules |
| **Plus** | $12 / mo | Messages (audio + letter), up to 5 GB, no Rendered Playback |
| **Family** | $25 / mo | Everything below + unlimited recipients + 25 GB + any 2 modules bundled |
| **Legacy Complete** | $35 / mo | Everything. All four modules + Rendered Playback included |
| **À la carte** | Add to Plus | Rendered Playback $4/mo · Recipe Vault $4/mo · Funeral Wishes $4/mo · Digital Goodbye $4/mo |

A Plus user recording 100 ten-minute audio messages would use ~700 MB — well under cap. Storage cost to us: roughly $0.02 / user / month at Supabase pricing.

The premium unit of value is no longer *storage allowance* (audio is cheap), it's **features per tier**. That's a better product story and lets us market clearly.

---

## 8. One strong recommendation on Digital Goodbye

**Do not store passwords.** Instead, link out to the user's existing password manager (1Password, Bitwarden, Dashlane, Apple Keychain).

Why:

- Liability: storing passwords makes us a top-tier target for attackers. One breach = catastrophic brand damage.
- Duplication: users with passwords already have a password manager. If they don't, pointing them at one is a value-add.
- Regulatory: passwords fall under different (stricter) regulations than general data. Our SOC 2 scope stays narrower without them.

What we DO store: the **location hint** ("1Password, vault: Family") and the intended action ("cancel this subscription"). The password itself stays in the password manager. The executor is told: *"All passwords are in your 1Password shared vault, access via [uncle's name]."*

This is the same model Ethical Will services use for this category. It's safer and still delivers the practical value.

---

## 9. Mental-health & ethical guardrails (unchanged from v1)

1. Recipients can pause delivery of future messages with one click.
2. 14 days' advance notice before every scheduled release.
3. One message per recipient per month max unless principal explicitly overrides.
4. 12-month clustered-delivery mode after a verified death (avoid drip-feeding acute grief).
5. **AI-generated content is not in MVP.** Revisit after we have 6 months of real-user feedback.
6. Keyword detection on transcripts flags self-harm / harm-to-others content for human review before seal.

---

## 10. Decisions I need from you before building

Only three left after your direction call:

1. **Pricing structure: bundle or à la carte or both?**
   My recommendation: offer Plus ($12) + Legacy Complete ($35) as the primary tiers, and list à la carte add-ons as an option but don't feature them. Bundles drive higher ARPU and simpler decisions.

2. **Which module do we build first after Messages core?**
   My recommendation order: **Messages (audio) → Digital Goodbye → Funeral Wishes → Recipes → Rendered Playback**. Rationale: Digital Goodbye and Funeral Wishes are mostly forms, quick to ship, and are the most-universally useful. Recipes need polish on the UX. Rendered Playback is the "wow" feature but needs the design prototype phase first.

3. **Who are we showing the Rendered Playback visual prototype to?**
   My recommendation: you + 3 to 5 real estate-planning customers (ideally women, ideally between 35–65 — your target persona). I can build the prototype; you source the reviewers. Two rounds of 30-minute calls should be enough to know if it clears the bar.

---

## 11. Revised build estimate

Assuming one full-stack developer familiar with the codebase:

| Phase | Work | Days |
|---|---|---|
| **Messages foundation** | Prisma migrations (Message, Recipient, Trigger, Prompt), API routes, audio upload flow, transcription | 3 |
| **Messages UX** | Record page, prompt picker, trim, recipient picker, trigger picker, library page | 4 |
| **Trigger verification** | Trusted-contact attestation flow, background worker for fires | 2 |
| **Digital Goodbye** | Prisma, API, list UX, category import | 2 |
| **Funeral Wishes** | Prisma, guided form, autosave | 1.5 |
| **Recipe Vault** | Prisma, API, list + detail UX, audio walkthrough, inheritor assignment | 3 |
| **Rendered Playback engine** | Timestamped transcript, theme renderer, five themes as React components | 3 |
| **Rendered Playback design iteration** | Visual prototypes + 2 rounds of review *(this is craft, not engineering)* | 3 (calendar time, not engineer time) |
| **Recipient inbox (minimal)** | `/inbox` page, email delivery, ack, pause button | 2 |
| **Polish, audit logs, QA** | End-to-end tests, edge cases, copy pass | 3 |
| **Total engineer days** | | **~23 days** |
| **Total calendar time** | Including design iteration and user reviews | **~6 weeks** |

A two-person team (one full-stack, one designer) could land in **4 calendar weeks**.

---

## 12. Recommended rollout order

**Week 1–2:** Messages foundation + core record/play UX (audio only, no rendered playback yet).
**Week 3:** Digital Goodbye + Funeral Wishes (both are mostly forms — fast wins).
**Week 4:** Recipe Vault.
**Week 5–6:** Rendered Playback engine + design iteration.
**Week 6:** Recipient inbox, trigger verification, final polish.

We can launch a **private beta** at the end of Week 4 with the form-based modules and basic audio Messages — real users can start using the product while we perfect Rendered Playback.

---

## 13. What's explicitly *not* in this MVP

- Video recording (no camcorder UX)
- AI-generated responses or synthetic-voice replies
- Printed / mailed letter delivery
- Collaborative recording (spouse + partner)
- Multi-language transcription (English only v1)
- Heirloom photo/object annotations beyond what fits in Recipes' origin-story field (separate module, plans TBD)
- Crypto-wallet recovery (too high-liability for v1)
- Password storage (deliberate — see §8)

---

## 14. Recommended next step

1. You answer §10's three questions (or push back on my recommendations).
2. I ship the **Messages foundation** (Prisma + API routes + migration) as one commit — no UX yet, just the bones you can `curl` against.
3. You smoke-test.
4. I build the **Messages UX** on a preview branch.
5. We parallel-track **Digital Goodbye** and **Funeral Wishes** (fast form-based modules) so you have three visible features in about two weeks.
6. Design-prototype phase for **Rendered Playback** starts in parallel with #5; I build the engine, you help source 3–5 reviewers.
