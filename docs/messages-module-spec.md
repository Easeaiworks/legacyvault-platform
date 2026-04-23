# LegacyVault — Messages Module (MVP Spec)

**Status:** draft for review
**Author:** LegacyVault team
**Scope:** audio + video + written messages, guided prompts, milestone-triggered delivery

---

## 1. What we're building (one paragraph)

A premium-tier feature inside LegacyVault that lets a user record audio or video messages (or write letters), pair each one with a recipient from their People list, and set a trigger for when the recipient receives it. Triggers can be absolute ("December 25, 2030"), relative to a recipient's life ("on Emma's 18th birthday"), life-event based ("when she gets married"), or after-death ("90 days after my verified passing"). The user can use guided prompts ("Tell them about the day they were born") so they never stare at a blank record button.

The feature creates a recurring reason to re-engage with the app — not a one-time estate document — and meaningfully raises willingness to pay.

---

## 2. Product principles (design north stars)

1. **Low-shame recording.** Audio-first defaults, guided prompts, one-click retake, no visible "take counter." People hate seeing themselves on camera.
2. **Seal, don't lock.** A sealed message is immutable to tampering but the principal can always revoke or replace.
3. **No surprise deliveries.** Every recipient gets a heads-up email before a message arrives; they can pause or delay delivery.
4. **The company's death shouldn't be the user's death.** Messages remain retrievable even if LegacyVault shuts down — documented escrow + open-source viewer path from day one.
5. **Subscription lapse ≠ data deletion.** If someone stops paying, they can't record new messages, but existing sealed messages stay on schedule. This is non-negotiable; deleting a deceased person's voice because of a billing issue is unconscionable.

---

## 3. Data model (Prisma additions)

Five new tables, all tenant-scoped, all with field-level encryption on message bodies/transcripts.

```prisma
enum MessageMediaType {
  AUDIO
  VIDEO
  LETTER
}

enum MessageStatus {
  DRAFT      // user is still composing
  SEALED     // finalized, awaiting trigger
  RELEASED   // delivered to recipient
  REVOKED    // principal pulled it back
  ARCHIVED   // subscription lapsed; still held, can't record new
}

enum TriggerKind {
  TIME_ABSOLUTE         // "December 25, 2030 at 9am"
  TIME_RELATIVE_TO_DOB  // "On Emma's 21st birthday"
  LIFE_EVENT            // "When she gets married"
  DEATH_PLUS            // "90 days after my verified passing"
}

enum TriggerEvent {
  GRADUATION
  MARRIAGE
  FIRST_CHILD
  DIVORCE
  ADDICTION_HELP_SOUGHT
  JOB_LOSS
  DIAGNOSIS
  GRIEF_FIRST_YEAR
  CUSTOM
}

model Message {
  id               String        @id @default(uuid())
  tenantId         String
  principalId      String        // who this is FROM
  title            String
  mediaType        MessageMediaType
  mediaKey         String?       // Supabase Storage object key
  mediaDurationSec Int?
  mediaSizeBytes   BigInt?
  thumbnailKey     String?

  // LETTER-type bodies are encrypted at rest (AES-256-GCM, per-tenant key)
  bodyCipher       Bytes?
  transcriptCipher Bytes?        // auto-transcribed for accessibility

  promptId         String?       // nullable; references MessagePrompt
  status           MessageStatus @default(DRAFT)
  sealedAt         DateTime?
  revokedAt        DateTime?

  recipients       MessageRecipient[]
  triggers         MessageTrigger[]

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([tenantId, principalId, status])
}

model MessageRecipient {
  id          String   @id @default(uuid())
  messageId   String
  personId    String   // links to existing Person table
  deliveredAt DateTime?
  viewedAt    DateTime?
  viewCount   Int      @default(0)
  pausedAt    DateTime?  // recipient-initiated pause

  @@unique([messageId, personId])
}

model MessageTrigger {
  id              String       @id @default(uuid())
  messageId       String
  kind            TriggerKind
  releaseAt       DateTime?    // for TIME_ABSOLUTE
  ageYears        Int?         // for TIME_RELATIVE_TO_DOB
  eventKind       TriggerEvent?
  daysAfterDeath  Int?         // for DEATH_PLUS (default 90)
  attestationPolicy Json?      // who must attest and how
  firedAt         DateTime?
}

model MessagePrompt {
  id        String  @id @default(uuid())
  tenantId  String? // null = system-provided
  category  String  // STORY, VALUES, APOLOGY, RECIPE, HEIRLOOM, FUNERAL, MILESTONE
  title     String
  body      String  // the prompt shown on screen
  isSystem  Boolean @default(false)
}
```

Notes:

- **Field encryption reuses existing `FieldCryptoService`.** Message bodies and transcripts go through the same AES-256-GCM + per-tenant-key scheme as asset notes and letters. The media blob itself is encrypted client-side before upload (this is new — see §7).
- **Recipients link to existing `Person` records.** No duplicate people store. Delivery requires a verified email OR phone on the Person record at trigger time.
- **Audit log entries** fire on every DRAFT → SEALED, SEALED → RELEASED, RELEASED → VIEWED transition.

---

## 4. API surface

All under `/api/messages/*`, authed via existing JWT middleware.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/messages` | Create draft |
| GET | `/api/messages` | List messages for current principal |
| GET | `/api/messages/:id` | Get one message (with triggers + recipients) |
| PATCH | `/api/messages/:id` | Update draft (title, body, etc.) |
| DELETE | `/api/messages/:id` | Delete draft or revoke sealed |
| POST | `/api/messages/:id/seal` | Draft → Sealed (cannot edit after this) |
| POST | `/api/messages/:id/upload` | Get presigned PUT URL for audio/video |
| POST | `/api/messages/:id/transcribe` | Kick off Whisper transcription |
| POST | `/api/messages/:id/recipients` | Add a recipient (links Person) |
| DELETE | `/api/messages/:id/recipients/:personId` | Remove a recipient |
| POST | `/api/messages/:id/triggers` | Set/replace the trigger |
| GET | `/api/messages/prompts?category=STORY` | Browse prompt catalog |
| GET | `/api/inbox` | *Recipient side* — list messages released to me |
| GET | `/api/inbox/:id` | *Recipient side* — stream one message |
| POST | `/api/inbox/:id/ack` | Mark viewed |
| POST | `/api/inbox/:id/pause` | Recipient-initiated pause |

A background worker (Vercel cron or Supabase Edge Function) runs every 15 minutes:

- Checks `MessageTrigger` rows whose conditions are satisfied.
- For `DEATH_PLUS` triggers, confirms death attestations passed the threshold.
- Moves `Message.status` SEALED → RELEASED, creates `MessageRecipient.deliveredAt`, sends the recipient email.

---

## 5. UX flow (record path, first sketch)

```
  /app/messages
      │
      ├──  "Record a message" ──▶ /app/messages/new
      │        │
      │        ├──  Pick a prompt (browse library, tabs: Story / Values /
      │        │    Milestone / Apology / Recipe / Heirloom / Funeral)
      │        │    OR  "Start blank"
      │        │
      │        ├──  Pick mode  [ Audio (recommended) │ Video │ Write ]
      │        │
      │        ├──  Record screen
      │        │    • Prompt text pinned at top
      │        │    • Mic/cam test
      │        │    • 10-min cap (avoid 2-hour Uncle Rob monologues)
      │        │    • Pause / resume / retake-from-beginning
      │        │
      │        ├──  Review
      │        │    • Scrubber, trim in/out (audio/video)
      │        │    • Auto-generated transcript shown below
      │        │
      │        ├──  Who's this for?
      │        │    • Picker pulls from People list
      │        │    • Multi-select allowed (one message, many recipients)
      │        │    • "Add someone new" opens quick-add Person form
      │        │
      │        ├──  When should they get it?
      │        │    [ Specific date │ Their birthday │ A life event │ After I'm gone ]
      │        │    • For life events, show: "We'll confirm this with
      │        │      [trusted contact] before releasing."
      │        │
      │        └──  Review + Seal
      │             • Confirmation: "Once sealed, you can still revoke
      │               but you can't edit. Seal it?"
      │
      ├──  Library (/app/messages)
      │    • Sort by recipient / by trigger date
      │    • "14 messages for Emma, covering ages 10 through 50"
      │    • Filter: Drafts / Sealed / Released / Revoked
      │
      └──  Dashboard widget
           • "3 messages scheduled to release this year"
           • "You haven't left anything for [Person] yet"
```

**Recipient side (future, not MVP):**

- Recipient gets a quiet email: *"A message from [name] is waiting for you on LegacyVault. You'll be able to view it any time after [date]."*
- Clicks through to `/inbox/:id`, does a light identity check (one-time email code).
- Views in a respectful UI: no ads, no recommendations, no "related content." Just the message, the transcript, and a download link.
- Can pause future deliveries from the same sender.

---

## 6. Prompt library (starter set)

System-provided prompts, grouped by category. Ship ~60 at launch. Examples:

- **STORY:** *"What's something about your parents you wish you'd asked them?"*
- **STORY:** *"Tell the story of the day [recipient] was born from your side of it."*
- **VALUES:** *"What do you believe that you were afraid to say out loud?"*
- **VALUES:** *"What's a mistake you made that turned into the best thing?"*
- **APOLOGY:** *"Is there something you want to say sorry for, clearly and without excuse?"*
- **RECIPE:** *"Walk me through [dish name] the way you actually make it. Include the weird steps."*
- **HEIRLOOM:** *"Describe [object]. Where is it? Who made it? Who should have it?"*
- **MILESTONE — graduation:** *"What do you wish someone had told you the day you left home?"*
- **MILESTONE — wedding:** *"What do you know now about marriage that you didn't on your wedding day?"*
- **MILESTONE — first child:** *"What's one thing you want them to know about the first time they meet their baby?"*
- **FUNERAL:** *"If you had to pick three songs for your funeral, what would they be and why?"*

Source-of-truth: JSON seed file in `packages/database/seeds/message-prompts.json`, loaded into `MessagePrompt` on deploy.

---

## 7. Storage, encryption, and economics

**Storage:** Supabase Storage bucket `lv-messages`, private. Keys are namespaced `{tenantId}/{messageId}/{mediaKind}/{filename}`.

**Encryption:**

- Audio/video are encrypted **client-side** before upload using a per-message symmetric key. The per-message key is itself encrypted with the principal's data key (derived from their auth factors) and stored alongside the message row. This means the server can't independently decrypt a user's recordings — only the principal or an authorized recipient can.
- LETTER bodies and transcripts use existing server-side FieldCryptoService (OK because we want to search/index them).

**Upload flow:**

1. Client calls `POST /api/messages/:id/upload` → gets presigned Supabase URL + per-message key to encrypt with.
2. Client encrypts the blob in-browser (WebCrypto AES-GCM), uploads to Supabase directly.
3. Server stores only the ciphertext and the wrapped key.

**Transcription:** runs on an ephemeral decrypted copy in a short-lived edge function, produces a transcript, encrypts it server-side, discards the plaintext. This is a pragmatic compromise — pure zero-knowledge would prevent transcription entirely.

**Economics (rough, Supabase Pro pricing):**

| Tier | Monthly price | Storage cap | Message count | Est. storage cost / user / month |
|---|---|---|---|---|
| Registry (free) | $0 | — | 0 | $0 |
| Plus | $12 | 5 GB | 25 | $0.10 |
| Family | $25 | 25 GB | Unlimited | $0.52 |

1080p video at typical encoder settings runs ~90 MB per minute. A Plus user recording 25 ten-minute videos would hit ~22 GB — above the cap. We set audio as the default and nudge users toward it; a 10-minute audio message is ~10 MB.

Budget line items to plan for on top of storage: Whisper transcription (~$0.006/min), Supabase egress on playback, email delivery (Resend or SendGrid), background worker compute.

**Long-tail storage risk:** these files may sit unread for 30+ years before a trigger fires. We need a contractual commitment to Supabase (or migrate to S3 Glacier Deep Archive for released-after-death content at 0.1× the cost). This is worth its own decision later.

---

## 8. Trigger verification (the hard part)

This is where most consumer time-capsule products cut corners. We shouldn't.

| Trigger | How we know it's true |
|---|---|
| **Time-absolute** | Trivial — just a date. |
| **Recipient birthday** | Person record has DOB; fire annually. |
| **Life event (graduation, marriage, etc.)** | Cannot verify automatically. Require the principal to nominate a **trusted contact** at seal time; when the event fires, we email that contact: *"[Principal] recorded a message for [recipient] to receive on their graduation. Has this happened?"* Two-person attestation ideal (trusted contact + recipient's own self-attest). Until attestation, message stays pending. |
| **After death (DEATH_PLUS)** | The hardest. Reuse existing dead-man's-switch infrastructure: trusted-contact attestation + one of {obituary URL we can scrape, uploaded death certificate, probate court filing}. Grace period of 30 days minimum before release; 90 default. Principal can override (e.g., terminal diagnosis, wants messages released sooner). |

**Failure modes we must design for:**

- **Trusted contact dies before the principal.** Every DEATH_PLUS and LIFE_EVENT trigger needs *at least two* attestors, plus a "if all attestors are unreachable after 12 months, fall back to notarized letter on file."
- **Recipient predeceases the principal.** Principal needs a dashboard alert, option to reassign or revoke.
- **Estrangement.** Principal needs to be able to revoke without the recipient ever being notified.

---

## 9. Mental-health and ethics guardrails

Non-negotiable for v1. These are what separate "thoughtful" from "creepy" in this space.

1. **Every delivered message includes a recipient-side "pause future deliveries" button.** One click, no guilt. Future messages from the same principal won't deliver until they un-pause.
2. **No surprise releases.** Recipients get 14 days' warning before a scheduled message arrives. They can request delay.
3. **Frequency throttle.** No more than one message per recipient per month by default, unless explicitly overridden by the principal.
4. **"Grief-sensitive mode."** For the first 12 months after a verified death, recipients see messages clustered, not drip-fed, to avoid prolonging acute grief.
5. **AI-generated content is NOT part of MVP.** Once we ship recorded messages we can evaluate whether AI-augmented messages (e.g., "ask my mom what she'd say about this") help or harm real users. Research is mixed. We'll design that deliberately, with opt-in consent while the principal is alive, not bolt it on.
6. **Content moderation.** Messages that appear to threaten self-harm or encourage recipients to self-harm must be flagged (to the principal while alive; to a mental-health resource on the recipient side). Automated keyword detection on transcripts, human review on flags.

---

## 10. Decisions I need from you before building

Five questions, ordered by how much they change the code:

1. **Audio-first or video-first as default mode?**
   *My recommendation: audio-first.* Cheaper storage, lower shame barrier, higher re-listen rate. Video remains an option.

2. **Should we build AI transcription at launch or V2?**
   Adds $0.006/min per message but huge accessibility + search win. *My recommendation: launch with it.*

3. **Maximum message length?**
   *My recommendation: 10 minutes for audio/video, 2,000 words for letters.* Longer messages get skimmed, shorter ones get re-played.

4. **Trigger-verification policy for life events — one attestor or two?**
   Two is safer but creates friction if the user only has one trusted contact. *My recommendation: one attestor for life events, two for DEATH_PLUS.*

5. **Pricing: is $12 / $25 per month close to where you want to land?**
   If we go lower ($8 / $18) we need to tighten storage caps. If higher ($20 / $40) we can be more generous and add white-glove features (human editor review, printed letter delivery). *My recommendation: start at $12/$25, measure retention.*

---

## 11. What's *not* in MVP

Intentionally deferred. None of these block launch.

- AI-generated responses or "conversations with the deceased"
- Video editing beyond trim in/out
- Collaborative messages (spouse + partner recording together)
- Heirloom photo annotations (separate feature, strong candidate for next quarter)
- Recipe vault (same — ships separately, possibly with the same record UI)
- Funeral-wishes module (same)
- Printed/mailed letter delivery
- Messages triggered by news events ("when you get your driver's license" is actually impossible without family attestation)
- Multi-language transcription (ship English-only v1, add on demand)

---

## 12. Rough build estimate

Assuming one full-stack dev familiar with the codebase:

| Phase | Work | Days |
|---|---|---|
| **Foundation** | Prisma migrations, API routes, background worker stub | 2 |
| **Recording UX** | Record page, audio/video capture, trim, upload flow | 3 |
| **Library & triggers** | List page, trigger picker, seal flow | 2 |
| **Prompts** | Prompt catalog + seed data + prompt-picker UI | 1 |
| **Encryption** | Client-side WebCrypto, key wrapping, server integration | 2 |
| **Transcription** | Whisper integration, background job | 1 |
| **Recipient side (minimal)** | `/inbox` page, email delivery, ack | 2 |
| **Trigger verification** | Trusted-contact attestation flow | 2 |
| **Polish & QA** | End-to-end demo, edge cases, audit logs | 3 |
| **Total** | | **~18 working days** |

This is 3–4 weeks of focused work for a single engineer. A two-person team could land in ~10 working days.

---

## 13. Recommended next step

1. **You review this doc** and answer the five decisions in §10 (or push back on any of the recommendations).
2. **I ship the Phase 1 foundation** (schema + API route scaffolding + migration) as a single commit for review — no UX yet, just the bones.
3. **You smoke-test** with Postman / curl.
4. **I build the Recording UX** as a separate branch so you can look at it in preview before it hits main.

This lets you steer at two clear checkpoints (after review, after foundation) before any UX work starts.
