-- Closed native-operator register. No roles, grants, cases or retention approvals are provisioned.
-- Separate production migration and policy acceptance are required; never a scheduler target.
BEGIN;
CREATE SCHEMA contact_decision_register;
REVOKE ALL ON SCHEMA contact_decision_register FROM PUBLIC;
CREATE TABLE contact_decision_register.entry (
  case_id uuid NOT NULL, revision integer NOT NULL CHECK (revision > 0),
  event_id uuid NOT NULL UNIQUE, operator_oid oid NOT NULL,
  outbox_id uuid NOT NULL, started_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  request jsonb NOT NULL, finalized_at timestamptz,
  PRIMARY KEY (case_id, revision)
);
CREATE UNIQUE INDEX contact_decision_one_case_per_outbox
  ON contact_decision_register.entry(outbox_id) WHERE revision = 1;
CREATE TABLE contact_decision_register.approval (
  run_id uuid PRIMARY KEY, operator_oid oid NOT NULL, policy_reference uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
  targets jsonb NOT NULL CHECK (jsonb_typeof(targets) = 'array' AND jsonb_array_length(targets) BETWEEN 1 AND 100),
  no_legal_hold boolean NOT NULL CHECK (no_legal_hold),
  copies_reviewed boolean NOT NULL CHECK (copies_reviewed),
  CHECK (expires_at > approved_at AND expires_at <= approved_at + interval '15 minutes')
);
CREATE TABLE contact_decision_register.permit (case_id uuid PRIMARY KEY, pid integer NOT NULL, tx bigint NOT NULL);
CREATE TABLE contact_decision_register.receipt (
  run_id uuid PRIMARY KEY, policy_reference uuid NOT NULL, completed_at timestamptz NOT NULL,
  case_count integer NOT NULL CHECK (case_count BETWEEN 1 AND 100), entry_count integer NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA contact_decision_register FROM PUBLIC;

CREATE FUNCTION contact_decision_register.guard_entry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $guard$
BEGIN
  IF TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM contact_decision_register.permit p
    WHERE p.case_id = OLD.case_id AND p.pid = pg_backend_pid() AND p.tx = txid_current()) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'CONTACT_REGISTER_IMMUTABLE' USING ERRCODE = '42501';
END;
$guard$;
CREATE TRIGGER contact_register_immutable BEFORE UPDATE OR DELETE ON contact_decision_register.entry
FOR EACH ROW EXECUTE FUNCTION contact_decision_register.guard_entry();

-- One authorization/integrity boundary for reads, appends and explicit purges.
CREATE FUNCTION contact_decision_register.assert_operator() RETURNS oid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp SET lock_timeout = '2s' AS $auth$
DECLARE who oid; relation_name text;
BEGIN
  SELECT oid INTO who FROM pg_roles WHERE rolname = session_user AND rolcanlogin
    AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolreplication;
  IF who IS NULL OR pg_has_role(who,current_user::regrole,'MEMBER')
    OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=who)
    OR has_schema_privilege(session_user,'public','CREATE')
    OR has_schema_privilege(session_user,'contact_decision_register','CREATE') THEN
    RAISE EXCEPTION 'CONTACT_REGISTER_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  FOREACH relation_name IN ARRAY ARRAY['contact_decision_register.entry','contact_decision_register.approval',
    'contact_decision_register.permit','contact_decision_register.receipt','public."NotificationOutbox"','public."MarketplaceAuditEvent"'] LOOP
    IF has_table_privilege(session_user,relation_name,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege(session_user,relation_name,'INSERT,UPDATE,REFERENCES') THEN
      RAISE EXCEPTION 'CONTACT_REGISTER_FORBIDDEN' USING ERRCODE='42501';
    END IF;
  END LOOP;
  IF NOT pg_try_advisory_xact_lock(310034) THEN RAISE EXCEPTION 'CONTACT_REGISTER_BUSY' USING ERRCODE='55P03'; END IF;
  LOCK TABLE contact_decision_register.entry,contact_decision_register.approval,
    contact_decision_register.permit,contact_decision_register.receipt IN SHARE UPDATE EXCLUSIVE MODE NOWAIT;
  IF current_setting('session_replication_role') <> 'origin'
    OR NOT EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      WHERE t.tgrelid='contact_decision_register.entry'::regclass AND t.tgname='contact_register_immutable'
      AND NOT t.tgisinternal AND t.tgfoid='contact_decision_register.guard_entry()'::regprocedure
      AND t.tgenabled='O' AND t.tgtype=27 AND t.tgqual IS NULL AND t.tgnargs=0
      AND p.proowner=current_user::regrole AND p.prosecdef AND p.proconfig=ARRAY['search_path=pg_catalog, pg_temp'])
    OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='contact_decision_register' AND NOT(t.tgrelid='contact_decision_register.entry'::regclass
        AND t.tgname='contact_register_immutable'))
    OR EXISTS(SELECT 1 FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='contact_decision_register')
    OR EXISTS(SELECT 1 FROM pg_constraint f JOIN pg_class c ON c.oid=f.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE f.contype='f' AND n.nspname='contact_decision_register') THEN RAISE EXCEPTION 'CONTACT_REGISTER_INTEGRITY'; END IF;
  RETURN who;
END;
$auth$;

CREATE FUNCTION contact_decision_register.append(p_case uuid,p_event uuid,p_expected integer,p_outbox uuid,p_request jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $append$
DECLARE who oid; last_entry contact_decision_register.entry%ROWTYPE; original contact_decision_register.entry%ROWTYPE;
  replay contact_decision_register.entry%ROWTYPE; item public."NotificationOutbox"%ROWTYPE;
  audit public."MarketplaceAuditEvent"%ROWTYPE; kind text; final_time timestamptz; anchor timestamptz;
BEGIN
  who:=contact_decision_register.assert_operator(); kind:=p_request->>'action';
  IF p_case IS NULL OR p_event IS NULL OR p_outbox IS NULL OR p_expected IS NULL OR p_expected < 0
    OR p_request IS NULL OR jsonb_typeof(p_request) <> 'object' OR pg_column_size(p_request)>2048
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_request) k WHERE k NOT IN
      ('action','reason','evidenceId','evidenceSha256','evidenceObservedAt','decisionId'))
    OR NOT coalesce(kind IN ('OPEN','TRIAGE','ESCALATE','UNKNOWN','PROPOSE_ACCEPTED','PROPOSE_NOT_ACCEPTED','FINALIZE'),false)
    OR NOT coalesce(p_request->>'reason' IN ('DELIVERY_UNCERTAIN','PROVIDER_REVIEW','MISSING_EVIDENCE',
      'DEADLINE_EXCEEDED','PROVIDER_ACCEPTANCE_PROVEN','PROVIDER_REJECTION_PROVEN','MATCHED_RECONCILIATION'),false)
    THEN RAISE EXCEPTION 'CONTACT_REGISTER_INVALID'; END IF;
  IF NOT coalesce((kind='OPEN' AND p_request->>'reason'='DELIVERY_UNCERTAIN')
    OR (kind='TRIAGE' AND p_request->>'reason'='PROVIDER_REVIEW')
    OR (kind IN ('ESCALATE','UNKNOWN') AND p_request->>'reason' IN ('MISSING_EVIDENCE','DEADLINE_EXCEEDED'))
    OR (kind='PROPOSE_ACCEPTED' AND p_request->>'reason'='PROVIDER_ACCEPTANCE_PROVEN')
    OR (kind='PROPOSE_NOT_ACCEPTED' AND p_request->>'reason'='PROVIDER_REJECTION_PROVEN')
    OR (kind='FINALIZE' AND p_request->>'reason'='MATCHED_RECONCILIATION'),false) THEN RAISE EXCEPTION 'CONTACT_REGISTER_INVALID'; END IF;
  IF kind IN ('PROPOSE_ACCEPTED','PROPOSE_NOT_ACCEPTED') THEN
    IF NOT coalesce(p_request->>'evidenceId' ~ '^[0-9a-f-]{36}$'
      AND p_request->>'decisionId' ~ '^[0-9a-f-]{36}$' AND p_request->>'evidenceSha256' ~ '^[0-9a-f]{64}$',false)
      OR p_request->>'evidenceObservedAt' IS NULL THEN RAISE EXCEPTION 'CONTACT_REGISTER_INVALID'; END IF;
    PERFORM (p_request->>'evidenceId')::uuid,(p_request->>'decisionId')::uuid;
  ELSIF p_request - 'action' - 'reason' <> '{}'::jsonb THEN RAISE EXCEPTION 'CONTACT_REGISTER_INVALID'; END IF;
  SELECT * INTO replay FROM contact_decision_register.entry WHERE event_id=p_event;
  IF FOUND THEN
    IF replay.case_id=p_case AND replay.operator_oid=who AND replay.outbox_id=p_outbox
      AND replay.request=p_request AND replay.revision=p_expected+1 THEN RETURN replay.revision; END IF;
    RAISE EXCEPTION 'CONTACT_REGISTER_CONFLICT';
  END IF;
  SELECT * INTO original FROM contact_decision_register.entry WHERE case_id=p_case AND revision=1;
  SELECT * INTO last_entry FROM contact_decision_register.entry WHERE case_id=p_case ORDER BY revision DESC LIMIT 1;
  IF last_entry.case_id IS NOT NULL AND (original.operator_oid<>who OR original.outbox_id<>p_outbox
      OR last_entry.revision<>p_expected OR last_entry.finalized_at IS NOT NULL OR kind='OPEN') THEN
    RAISE EXCEPTION 'CONTACT_REGISTER_CONFLICT'; END IF;
  IF kind='OPEN' THEN
    IF p_expected<>0 OR original.case_id IS NOT NULL THEN RAISE EXCEPTION 'CONTACT_REGISTER_CONFLICT'; END IF;
    SELECT * INTO item FROM public."NotificationOutbox" WHERE "id"=p_outbox FOR SHARE;
    IF NOT FOUND OR item."templateKey"<>'CONTACT_MESSAGE' OR item.channel<>'EMAIL' OR item."recipientUserId" IS NOT NULL
      OR item.status<>'FAILED' OR item."attemptCount"<1 OR item."firstAttemptAt" IS NULL
      OR item."firstAttemptAt"<item."createdAt" OR item."firstAttemptAt">clock_timestamp()
      OR item."leaseUntil">clock_timestamp()
      OR EXISTS(SELECT 1 FROM public."MarketplaceAuditEvent" WHERE "correlationKey"='contact-reconcile:'||p_outbox::text)
      THEN RAISE EXCEPTION 'CONTACT_REGISTER_INELIGIBLE'; END IF;
    anchor:=item."firstAttemptAt";
  ELSE
    IF original.case_id IS NULL THEN RAISE EXCEPTION 'CONTACT_REGISTER_CONFLICT'; END IF;
    anchor:=original.started_at;
    IF kind IN ('PROPOSE_ACCEPTED','PROPOSE_NOT_ACCEPTED') THEN
      IF (p_request->>'evidenceObservedAt')::timestamptz < anchor
        OR (p_request->>'evidenceObservedAt')::timestamptz > clock_timestamp()
        OR NOT EXISTS(SELECT 1 FROM contact_decision_register.entry WHERE case_id=p_case AND request->>'action'='TRIAGE')
        THEN RAISE EXCEPTION 'CONTACT_REGISTER_INELIGIBLE'; END IF;
    END IF;
    IF kind='FINALIZE' THEN
      SELECT * INTO audit FROM public."MarketplaceAuditEvent" WHERE "correlationKey"='contact-reconcile:'||p_outbox::text FOR SHARE;
      IF NOT FOUND OR NOT coalesce(audit.action='CONTACT_RECONCILED' AND audit."entityType"='NotificationOutbox'
        AND audit."entityId"=p_outbox AND audit."actorRole"='CONTACT_RECONCILIATION_OPERATOR'
        AND audit."actorUserId" IS NOT NULL AND audit."organizationId" IS NULL AND audit."previousState"='FAILED'
        AND audit.metadata->>'policyVersion'='CONTACT_RECONCILIATION_V1'
        AND audit.metadata->>'decisionHash' ~ '^[0-9a-f]{64}$'
        AND audit.metadata->>'decisionId'=last_entry.request->>'decisionId'
        AND audit.metadata->>'evidenceId'=last_entry.request->>'evidenceId'
        AND audit.metadata->>'evidenceSha256'=last_entry.request->>'evidenceSha256'
        AND (audit.metadata->>'evidenceObservedAt')::timestamptz=(last_entry.request->>'evidenceObservedAt')::timestamptz
        AND ((last_entry.request->>'action'='PROPOSE_ACCEPTED' AND audit."nextState"='SENT' AND audit.reason='PROVIDER_ACCEPTANCE_PROVEN' AND audit.metadata->>'outcome'='ACCEPTED')
          OR (last_entry.request->>'action'='PROPOSE_NOT_ACCEPTED' AND audit."nextState"='FAILED' AND audit.reason='PROVIDER_REJECTION_PROVEN' AND audit.metadata->>'outcome'='NOT_ACCEPTED'))
        AND audit."createdAt">=last_entry.recorded_at AND audit."createdAt"<=clock_timestamp(),false)
        THEN RAISE EXCEPTION 'CONTACT_REGISTER_NOT_FINAL'; END IF;
      SELECT * INTO item FROM public."NotificationOutbox" WHERE "id"=p_outbox FOR SHARE;
      IF FOUND AND (item.status::text<>audit."nextState" OR item."processedAt" IS DISTINCT FROM audit."createdAt"
        OR item."leaseUntil">clock_timestamp()) THEN RAISE EXCEPTION 'CONTACT_REGISTER_NOT_FINAL'; END IF;
      final_time:=audit."createdAt";
    END IF;
  END IF;
  INSERT INTO contact_decision_register.entry VALUES(p_case,p_expected+1,p_event,who,p_outbox,anchor,clock_timestamp(),p_request,final_time);
  RETURN p_expected+1;
END;
$append$;

CREATE FUNCTION contact_decision_register.read_case(p_case uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $read$
DECLARE who oid; first_entry contact_decision_register.entry%ROWTYPE; last_entry contact_decision_register.entry%ROWTYPE;
BEGIN
  who:=contact_decision_register.assert_operator();
  SELECT * INTO first_entry FROM contact_decision_register.entry WHERE case_id=p_case AND revision=1;
  IF NOT FOUND OR first_entry.operator_oid<>who THEN RAISE EXCEPTION 'CONTACT_REGISTER_FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT * INTO last_entry FROM contact_decision_register.entry WHERE case_id=p_case ORDER BY revision DESC LIMIT 1;
  RETURN jsonb_build_object('caseId',p_case,'outboxId',first_entry.outbox_id,'revision',last_entry.revision,'finalizedAt',last_entry.finalized_at,
    'triageDueAt',first_entry.started_at+interval '24 hours','escalationDueAt',first_entry.started_at+interval '72 hours',
    'decisionDueAt',first_entry.started_at+interval '168 hours','retentionApproved',false,
    'deletionCandidateAt',last_entry.finalized_at+interval '720 hours',
    'history',(SELECT jsonb_agg(jsonb_build_object('revision',e.revision,'action',e.request,'recordedAt',e.recorded_at,'operatorOid',e.operator_oid) ORDER BY e.revision)
      FROM contact_decision_register.entry e WHERE e.case_id=p_case));
END;
$read$;

CREATE FUNCTION contact_decision_register.purge(p_run uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $purge$
DECLARE who oid; auth contact_decision_register.approval%ROWTYPE; t jsonb;
  last_entry contact_decision_register.entry%ROWTYPE; cases integer:=0; entries integer:=0; n integer;
BEGIN
  who:=contact_decision_register.assert_operator();
  SELECT case_count INTO n FROM contact_decision_register.receipt WHERE run_id=p_run;
  IF FOUND THEN RETURN n; END IF;
  SELECT * INTO auth FROM contact_decision_register.approval WHERE run_id=p_run FOR UPDATE NOWAIT;
  IF NOT FOUND OR auth.operator_oid<>who OR auth.approved_at>clock_timestamp() OR auth.expires_at<=clock_timestamp()
    THEN RAISE EXCEPTION 'CONTACT_REGISTER_PURGE_CLOSED' USING ERRCODE='42501'; END IF;
  IF (SELECT count(DISTINCT x->>'caseId') FROM jsonb_array_elements(auth.targets) x)<>jsonb_array_length(auth.targets)
    THEN RAISE EXCEPTION 'CONTACT_REGISTER_INVALID'; END IF;
  FOR t IN SELECT * FROM jsonb_array_elements(auth.targets) LOOP
    IF jsonb_typeof(t)<>'object' OR t-'caseId'-'revision'<>'{}'::jsonb
      OR NOT coalesce(t->>'caseId' ~ '^[0-9a-f-]{36}$' AND t->>'revision' ~ '^[1-9][0-9]{0,8}$',false)
      THEN RAISE EXCEPTION 'CONTACT_REGISTER_INVALID'; END IF;
    SELECT * INTO last_entry FROM contact_decision_register.entry WHERE case_id=(t->>'caseId')::uuid ORDER BY revision DESC LIMIT 1;
    IF NOT FOUND OR last_entry.revision<>(t->>'revision')::integer OR last_entry.operator_oid<>who
      OR last_entry.finalized_at IS NULL OR last_entry.finalized_at>clock_timestamp()-interval '720 hours'
      OR EXISTS(SELECT 1 FROM public."NotificationOutbox" WHERE "id"=last_entry.outbox_id)
      THEN RAISE EXCEPTION 'CONTACT_REGISTER_INELIGIBLE'; END IF;
    INSERT INTO contact_decision_register.permit VALUES(last_entry.case_id,pg_backend_pid(),txid_current());
    DELETE FROM contact_decision_register.entry WHERE case_id=last_entry.case_id;
    GET DIAGNOSTICS n=ROW_COUNT; entries:=entries+n; cases:=cases+1;
    DELETE FROM contact_decision_register.permit WHERE case_id=last_entry.case_id;
  END LOOP;
  IF auth.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'CONTACT_REGISTER_PURGE_EXPIRED'; END IF;
  INSERT INTO contact_decision_register.receipt VALUES(p_run,auth.policy_reference,clock_timestamp(),cases,entries);
  DELETE FROM contact_decision_register.approval WHERE run_id=p_run;
  RETURN cases;
END;
$purge$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA contact_decision_register FROM PUBLIC;
DO $acl$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_namespace n,LATERAL aclexplode(n.nspacl) a WHERE n.nspname='contact_decision_register' AND a.grantee<>n.nspowner)
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,LATERAL aclexplode(c.relacl) a WHERE n.nspname='contact_decision_register' AND a.grantee<>c.relowner)
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,LATERAL aclexplode(p.proacl) a WHERE n.nspname='contact_decision_register' AND a.grantee<>p.proowner)
    THEN RAISE EXCEPTION 'CONTACT_REGISTER_UNSAFE_DEFAULT_PRIVILEGES'; END IF;
END;
$acl$;
COMMIT;
