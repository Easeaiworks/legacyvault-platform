-- Immutable audit log enforcement.
-- Prisma Migrate will generate the base CREATE TABLE statements from schema.prisma.
-- This supplemental migration adds the immutability guarantees that can't be expressed
-- in Prisma's schema language.
--
-- Apply this AFTER the initial schema migration runs.

-- Prevent UPDATE and DELETE on audit_logs at the database level.
-- Only INSERT and SELECT are allowed.
REVOKE UPDATE, DELETE ON TABLE audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON TABLE audit_logs FROM legacyvault;

-- Enforce via trigger as defense-in-depth (in case roles are misconfigured later).
CREATE OR REPLACE FUNCTION audit_logs_no_modify() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; % is not permitted', TG_OP;
END;
$$;

CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_no_modify();

CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_no_modify();

-- Row-Level-Security scaffolding (enabled in later migration once RLS policies are ready).
-- Marking tables here for documentation; enabling is an intentional later step.
--   ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE principals ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE heir_search_cases ENABLE ROW LEVEL SECURITY;
