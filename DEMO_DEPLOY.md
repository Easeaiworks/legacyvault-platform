# Getting the demo live

This gets you a shareable `https://legacyvault-demo.vercel.app` (or similar) URL that
drops visitors into a fully populated Ada Lovelace estate — no signup required.

## What's already done

The Supabase side is provisioned and seeded:

- **Project:** `legacyvault-demo` in `Easeaiworks's Org`
- **Ref:** `qfutplyktmzexcdufalv`
- **Region:** `us-east-1`
- **DB host:** `db.qfutplyktmzexcdufalv.supabase.co`
- **Loaded:** 18 tables, 1 demo tenant (Ada Lovelace), 15 assets, 8 people, 12 beneficiaries (with one deliberate missing primary + one under-allocated + one inconsistent — to demo the conflict engine), 3 trusted contacts, 5 letters, 1 registry entry, 8 document metadata rows, and a private `legacyvault-documents` storage bucket.

## Architecture of the demo

```
  Vercel                  Railway               Supabase
  ┌──────────┐            ┌──────────┐          ┌──────────────┐
  │ Next.js  │───HTTPS──▶ │ NestJS   │─Postgres▶│ legacyvault  │
  │ web app  │            │ API      │          │   -demo      │
  └──────────┘            ├──────────┤          │              │
                          │ Worker   │─────────▶│   Storage    │
                          │ (cron)   │          │   (S3-compat)│
                          └──────────┘          └──────────────┘
```

## Step 1 — Railway: API + Worker (~5 min)

1. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Pick **Easeaiworks/legacyvault-platform**
3. Railway detects the monorepo — it may ask you to pick a root. **Don't** pick a sub-folder; let it use the repo root. You'll add services individually.
4. Once the project is created, you'll see one service. Rename it to **api**:
   - Settings → **Service Name** → `api`
   - Settings → **Source** → Root directory: `/`
   - Settings → **Build** → Dockerfile path: `apps/api/Dockerfile`
   - Settings → **Deploy** → Health check path: `/v1/health`
5. Add environment variables (Settings → **Variables**):

   ```
   NODE_ENV=production
   PORT=4000
   DEMO_MODE=true
   DEMO_SEED_ON_START=true
   APP_URL=https://legacyvault-demo.vercel.app        # update after Vercel deploy
   API_URL=https://<railway-api-url>                   # Railway auto-generates; copy it
   CORS_ORIGINS=https://legacyvault-demo.vercel.app

   # Supabase database
   DATABASE_URL=postgresql://postgres.qfutplyktmzexcdufalv:<DB_PASSWORD>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   # (get <DB_PASSWORD> from Supabase: Project Settings → Database → Connection string)

   # Redis — add the Railway Redis addon then point at its URL
   REDIS_URL=${{Redis.REDIS_URL}}

   # Document storage — uses Supabase Storage's S3-compat endpoint
   S3_ENDPOINT=https://qfutplyktmzexcdufalv.supabase.co/storage/v1/s3
   S3_BUCKET=legacyvault-documents
   S3_REGION=us-east-1
   S3_ACCESS_KEY=<supabase S3 access key>              # Project Settings → Storage → S3 Access Keys
   S3_SECRET_KEY=<supabase S3 secret key>
   S3_FORCE_PATH_STYLE=true

   # App secrets — generate these once and keep them
   FIELD_ENCRYPTION_KEY=<`openssl rand -base64 32`>
   JWT_SECRET=<`openssl rand -base64 64`>

   # Auth — demo stays on local mode; no WorkOS needed
   AUTH_PROVIDER=local

   # Observability — optional for demo
   LOG_LEVEL=info
   TRUST_PROXY=true
   ```

6. Click **Deploy**. Wait ~3 min for the build.
7. Add a second service in the same project: **New → GitHub Repo → same repo**, rename it to **worker**:
   - Settings → Dockerfile path: `apps/worker/Dockerfile`
   - Settings → Variables: same `DATABASE_URL` and `REDIS_URL` as the api
   - No public URL needed (it's a background job)
8. Add a Redis addon: **New → Database → Redis**. Railway auto-injects `REDIS_URL`.
9. Copy the public URL of the **api** service (Settings → Networking → **Generate Domain**). Keep it handy for the next step.

## Step 2 — Vercel: web app (~3 min)

1. Go to https://vercel.com/new
2. **Import Git Repository** → pick **Easeaiworks/legacyvault-platform**
3. On the configuration screen:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** leave default
4. Environment Variables:

   ```
   NEXT_PUBLIC_API_URL=https://<railway-api-url>/v1
   NEXT_PUBLIC_DEMO_MODE=true
   NEXT_PUBLIC_AUTH_PROVIDER=local
   ```

5. **Deploy**. Wait ~2 min.
6. Copy the Vercel URL (e.g. `legacyvault-demo.vercel.app`).
7. Go back to Railway → api service → **Variables** → update:
   - `APP_URL=<vercel-url>`
   - `CORS_ORIGINS=<vercel-url>`

   Redeploy the api service.

## Step 3 — Share the demo

The demo URL is:

```
https://<vercel-url>/demo
```

That link auto-signs the visitor in as Ada Lovelace. They land on the overview with
a ~80% completeness plan, 15 assets worth about $4.8M, live beneficiary conflicts,
and can explore every feature.

The landing page at `https://<vercel-url>/` leads with the registry signup as the
first impression.

## Where to look for things

| What | Where |
| --- | --- |
| Supabase admin UI (browse demo data) | https://supabase.com/dashboard/project/qfutplyktmzexcdufalv |
| Railway logs | https://railway.app → project → api / worker → Logs |
| Vercel logs | https://vercel.com → project → Logs |
| DB password | Supabase → Project Settings → Database → Connection string |
| S3 credentials | Supabase → Project Settings → Storage → S3 Access Keys |

## Troubleshooting

**Railway build fails with "Cannot find module 'prisma'":** The Dockerfile runs
`prisma generate` as part of build. Make sure `packages/database/prisma/schema.prisma`
is being copied in — check the `COPY . .` line is present.

**API 502s on first request:** Railway uses cold starts. The first request after
idle takes ~5s. This is normal for demo; production on ECS/Fargate would not.

**CORS errors from the web app:** the `CORS_ORIGINS` variable on the api service
must exactly match the Vercel URL (including the `https://` prefix, no trailing slash).

**`/demo` returns 401:** make sure `DEMO_MODE=true` is set on the api service AND
`NEXT_PUBLIC_DEMO_MODE=true` on Vercel.

**Demo data is missing:** the seed already ran against Supabase from this session.
If someone truncates the tables, re-run the seed SQL from `DEMO_DEPLOY.md` step 1.
Setting `DEMO_SEED_ON_START=true` also has the API service re-apply the seed on
every deploy (idempotent — safe to leave on).

## Taking it down

Delete in this order to avoid orphan charges:

1. Vercel: project settings → Delete Project
2. Railway: project settings → Delete (kills api + worker + Redis)
3. Supabase: dashboard → `legacyvault-demo` project → Settings → Pause or Delete
   (Pausing drops the $10/mo charge without losing data; deletion is permanent.)
