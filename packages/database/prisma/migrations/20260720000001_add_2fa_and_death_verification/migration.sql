-- TOTP 2FA columns on users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "totp_secret_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "totp_enabled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "totp_backup_codes_hashed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- DeathVerification enum
DO $$ BEGIN
  CREATE TYPE "DeathVerificationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'WITHDRAWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "death_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "principal_id" UUID NOT NULL,
    "submitted_by_person_id" UUID NOT NULL,
    "document_id" UUID,
    "status" "DeathVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "supporting_evidence" TEXT,
    "submitter_notes" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "death_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "death_verifications_tenant_id_idx" ON "death_verifications"("tenant_id");
CREATE INDEX IF NOT EXISTS "death_verifications_principal_id_idx" ON "death_verifications"("principal_id");
CREATE INDEX IF NOT EXISTS "death_verifications_status_idx" ON "death_verifications"("status");
