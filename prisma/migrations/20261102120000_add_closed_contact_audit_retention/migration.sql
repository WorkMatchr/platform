-- Closed operator-only exception. No grants, roles, approvals or deletions are provisioned.
-- A separate reviewed approval is necessary before this migration or a purge in production.
BEGIN;
CREATE SCHEMA contact_audit_retention;
REVOKE ALL ON SCHEMA contact_audit_retention FROM PUBLIC;

-- Short-lived, individually reviewed deletion manifest. Only the schema owner provisions it.
-- The purge operator must NOT own these objects or inherit the owner's privileges.
CREATE TABLE contact_audit_retention.approval (
  run_id uuid PRIMARY KEY,
  operator_oid oid NOT NULL,
  policy_reference uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  targets jsonb NOT NULL CHECK (jsonb_typeof(targets) = 'array' AND jsonb_array_length(targets) BETWEEN 1 AND 100),
  register_reviewed boolean NOT NULL CHECK (register_reviewed),
  no_legal_hold boolean NOT NULL CHECK (no_legal_hold),
  CHECK (expires_at > approved_at AND expires_at <= approved_at + interval '15 minutes')
);
-- Internal per-row capability, created and consumed in the SAME transaction. Not a GUC.
CREATE TABLE contact_audit_retention.permit (
  audit_id uuid PRIMARY KEY,
  backend_pid integer NOT NULL,
  transaction_id bigint NOT NULL
);
-- Aggregate receipt; deliberately no deleted IDs, hashes, actor, provider or message data.
CREATE TABLE contact_audit_retention.receipt (
  run_id uuid PRIMARY KEY,
  policy_reference uuid NOT NULL,
  completed_at timestamptz NOT NULL,
  deleted_count integer NOT NULL CHECK (deleted_count BETWEEN 1 AND 100)
);
REVOKE ALL ON ALL TABLES IN SCHEMA contact_audit_retention FROM PUBLIC;

CREATE FUNCTION contact_audit_retention.guard_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $guard$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."action" = 'CONTACT_RECONCILED'
    AND OLD."entityType" = 'NotificationOutbox'
    AND OLD."metadata"->>'policyVersion' = 'CONTACT_RECONCILIATION_V1' THEN
    DELETE FROM contact_audit_retention.permit
    WHERE audit_id = OLD."id" AND backend_pid = pg_backend_pid() AND transaction_id = txid_current();
    IF FOUND THEN RETURN OLD; END IF;
  END IF;
  RAISE EXCEPTION 'MarketplaceAuditEvent is append-only' USING ERRCODE = '42501';
END;
$guard$;
REVOKE ALL ON FUNCTION contact_audit_retention.guard_audit() FROM PUBLIC;

-- Replace only THIS table's guard atomically. The general function and all other guards stay intact.
DROP TRIGGER "MarketplaceAuditEvent_append_only" ON public."MarketplaceAuditEvent";
CREATE TRIGGER "MarketplaceAuditEvent_append_only" BEFORE UPDATE OR DELETE ON public."MarketplaceAuditEvent"
FOR EACH ROW EXECUTE FUNCTION contact_audit_retention.guard_audit();

CREATE FUNCTION contact_audit_retention.purge(p_run_id uuid)
RETURNS TABLE (run_id uuid, policy_reference uuid, completed_at timestamptz, deleted_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '2s' AS $purge$
DECLARE
  auth contact_audit_retention.approval%ROWTYPE;
  item record;
  audit public."MarketplaceAuditEvent"%ROWTYPE;
  operator_id oid;
  relation_name text;
  total integer := 0;
BEGIN
  -- Native individual DB authentication; SET ROLE, web sessions and bearer tokens confer no authority.
  SELECT oid INTO operator_id FROM pg_roles WHERE rolname = session_user
    AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolreplication;
  IF operator_id IS NULL OR pg_has_role(operator_id, current_user::regrole, 'MEMBER')
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = operator_id)
    OR has_schema_privilege(session_user, 'contact_audit_retention', 'CREATE')
    OR has_schema_privilege(session_user, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  FOREACH relation_name IN ARRAY ARRAY['contact_audit_retention.approval', 'contact_audit_retention.permit',
    'contact_audit_retention.receipt', 'public."MarketplaceAuditEvent"', 'public."NotificationOutbox"'] LOOP
    -- TRIGGER/REFERENCES can introduce code executed under this definer, even without DML grants.
    IF has_table_privilege(session_user, relation_name, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege(session_user, relation_name, 'INSERT,UPDATE,REFERENCES') THEN
      RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_FORBIDDEN' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  IF NOT pg_try_advisory_xact_lock(310034) THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_BUSY' USING ERRCODE = '55P03';
  END IF;
  -- Prevent a concurrent DDL/trigger installation between inspection and execution.
  -- SHARE UPDATE EXCLUSIVE remains compatible with ordinary ROW EXCLUSIVE DML.
  LOCK TABLE public."MarketplaceAuditEvent", contact_audit_retention.approval,
    contact_audit_retention.permit, contact_audit_retention.receipt IN SHARE UPDATE EXCLUSIVE MODE NOWAIT;
  IF current_setting('session_replication_role') <> 'origin'
    OR NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE t.tgrelid = 'public."MarketplaceAuditEvent"'::regclass
        AND t.tgname = 'MarketplaceAuditEvent_append_only' AND NOT t.tgisinternal
        AND t.tgfoid = 'contact_audit_retention.guard_audit()'::regprocedure
        AND t.tgenabled = 'O' AND t.tgtype = 27 AND t.tgqual IS NULL AND t.tgnargs = 0
        AND p.proowner = current_user::regrole AND p.prosecdef
        AND p.proconfig = ARRAY['search_path=pg_catalog, pg_temp'])
    OR EXISTS (SELECT 1 FROM pg_trigger t WHERE
      (t.tgrelid = 'public."MarketplaceAuditEvent"'::regclass
        AND t.tgname <> 'MarketplaceAuditEvent_append_only' AND (NOT t.tgisinternal OR (t.tgtype::int & 8) <> 0))
      OR t.tgrelid IN ('contact_audit_retention.approval'::regclass,
        'contact_audit_retention.permit'::regclass, 'contact_audit_retention.receipt'::regclass))
    OR EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class IN ('public."MarketplaceAuditEvent"'::regclass,
      'contact_audit_retention.approval'::regclass, 'contact_audit_retention.permit'::regclass,
      'contact_audit_retention.receipt'::regclass)) THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_INTEGRITY';
  END IF;
  -- A retry of a completed run only returns its aggregate receipt, never deletes a different batch.
  RETURN QUERY SELECT r.run_id, r.policy_reference, r.completed_at, r.deleted_count
    FROM contact_audit_retention.receipt r WHERE r.run_id = p_run_id;
  IF FOUND THEN RETURN; END IF;
  SELECT * INTO auth FROM contact_audit_retention.approval a WHERE a.run_id = p_run_id FOR UPDATE NOWAIT;
  IF NOT FOUND OR auth.operator_oid <> operator_id OR auth.approved_at > clock_timestamp()
    OR auth.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_CLOSED' USING ERRCODE = '42501';
  END IF;
  -- Malformed or duplicate targets fail the whole operation. No client-provided clock or cutoff.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(auth.targets) t WHERE jsonb_typeof(t) <> 'object'
    OR NOT coalesce(t->>'auditId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false)
    OR NOT coalesce(t->>'decisionHash' ~ '^[0-9a-f]{64}$', false))
    OR (SELECT count(DISTINCT t->>'auditId') FROM jsonb_array_elements(auth.targets) t) <> jsonb_array_length(auth.targets) THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_INVALID';
  END IF;
  FOR item IN SELECT (t->>'auditId')::uuid AS id, t->>'decisionHash' AS hash
    FROM jsonb_array_elements(auth.targets) t ORDER BY t->>'auditId' LOOP
    SELECT * INTO audit FROM public."MarketplaceAuditEvent" a WHERE a."id" = item.id FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_INELIGIBLE'; END IF;
    IF NOT coalesce(
      audit."action" = 'CONTACT_RECONCILED' AND audit."entityType" = 'NotificationOutbox'
      AND audit."correlationKey" = 'contact-reconcile:' || audit."entityId"::text
      AND audit."actorUserId" IS NOT NULL AND audit."organizationId" IS NULL
      AND audit."actorRole" = 'CONTACT_RECONCILIATION_OPERATOR' AND audit."previousState" = 'FAILED'
      AND audit."metadata"->>'policyVersion' = 'CONTACT_RECONCILIATION_V1'
      AND audit."metadata"->>'decisionHash' = item.hash
      AND audit."createdAt" <= clock_timestamp() - interval '720 hours'
      AND ((audit."nextState" = 'SENT' AND audit."reason" = 'PROVIDER_ACCEPTANCE_PROVEN'
        AND audit."metadata"->>'outcome' = 'ACCEPTED')
        OR (audit."nextState" = 'FAILED' AND audit."reason" = 'PROVIDER_REJECTION_PROVEN'
        AND audit."metadata"->>'outcome' = 'NOT_ACCEPTED')), false)
      OR EXISTS (SELECT 1 FROM public."NotificationOutbox" o WHERE o."id" = audit."entityId") THEN
      RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_INELIGIBLE';
    END IF;
    -- Existing retention must remove the finalized outbox FIRST; this function never touches it.
    INSERT INTO contact_audit_retention.permit VALUES (item.id, pg_backend_pid(), txid_current());
    DELETE FROM public."MarketplaceAuditEvent" WHERE "id" = item.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_INCOMPLETE'; END IF;
    total := total + 1;
  END LOOP;
  IF auth.expires_at <= clock_timestamp() OR EXISTS (SELECT 1 FROM contact_audit_retention.permit
    WHERE backend_pid = pg_backend_pid() AND transaction_id = txid_current()) THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_PURGE_INCOMPLETE';
  END IF;
  INSERT INTO contact_audit_retention.receipt VALUES (p_run_id, auth.policy_reference, clock_timestamp(), total);
  DELETE FROM contact_audit_retention.approval a WHERE a.run_id = p_run_id;
  RETURN QUERY SELECT r.run_id, r.policy_reference, r.completed_at, r.deleted_count
    FROM contact_audit_retention.receipt r WHERE r.run_id = p_run_id;
END;
$purge$;
REVOKE ALL ON FUNCTION contact_audit_retention.purge(uuid) FROM PUBLIC;
-- Fail installation if inherited default privileges would expose private capabilities.
DO $acl$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace n, LATERAL aclexplode(n.nspacl) a
      WHERE n.nspname = 'contact_audit_retention' AND a.grantee <> n.nspowner)
    OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
      LATERAL aclexplode(c.relacl) a
      WHERE n.nspname = 'contact_audit_retention' AND a.grantee <> c.relowner)
    OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
      LATERAL aclexplode(p.proacl) a
      WHERE n.nspname = 'contact_audit_retention' AND a.grantee <> p.proowner) THEN
    RAISE EXCEPTION 'CONTACT_AUDIT_RETENTION_UNSAFE_DEFAULT_PRIVILEGES';
  END IF;
END;
$acl$;
COMMIT;
