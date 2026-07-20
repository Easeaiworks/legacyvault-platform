-- Deceased-relative records + Relationship enum extensions.
-- Powers unclaimed-asset search, SSN Death Master File lookups, provincial escheat matching.

-- Extend Relationship enum with ancestral values.
ALTER TYPE "Relationship" ADD VALUE IF NOT EXISTS 'GREAT_GRANDPARENT';
ALTER TYPE "Relationship" ADD VALUE IF NOT EXISTS 'AUNT_UNCLE';
ALTER TYPE "Relationship" ADD VALUE IF NOT EXISTS 'COUSIN';

-- CreateTable
CREATE TABLE "deceased_relatives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "principal_id" UUID NOT NULL,
    "legal_first_name" TEXT NOT NULL,
    "legal_middle_name" TEXT,
    "legal_last_name" TEXT NOT NULL,
    "prior_names" JSONB NOT NULL DEFAULT '[]',
    "relationship" "Relationship" NOT NULL,
    "date_of_birth" DATE,
    "date_of_death" DATE,
    "birth_city" TEXT,
    "birth_country" CHAR(2),
    "last_known_city" TEXT,
    "last_known_region" VARCHAR(8),
    "last_known_country" CHAR(2),
    "previous_addresses" JSONB NOT NULL DEFAULT '[]',
    "employers" JSONB NOT NULL DEFAULT '[]',
    "financial_institutions" JSONB NOT NULL DEFAULT '[]',
    "gov_id_country" CHAR(2),
    "gov_id_last4" VARCHAR(4),
    "gov_id_full_encrypted" TEXT,
    "military_service" BOOLEAN NOT NULL DEFAULT false,
    "death_certificate_available" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "deceased_relatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deceased_relatives_tenant_id_idx" ON "deceased_relatives"("tenant_id");
CREATE INDEX "deceased_relatives_principal_id_idx" ON "deceased_relatives"("principal_id");
CREATE INDEX "deceased_relatives_legal_last_name_legal_first_name_idx" ON "deceased_relatives"("legal_last_name", "legal_first_name");
CREATE INDEX "deceased_relatives_gov_id_country_gov_id_last4_idx" ON "deceased_relatives"("gov_id_country", "gov_id_last4");

-- AddForeignKey
ALTER TABLE "deceased_relatives"
  ADD CONSTRAINT "deceased_relatives_principal_id_fkey"
  FOREIGN KEY ("principal_id") REFERENCES "principals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
