-- Metadata/aggregates only; no row payloads, password hashes, query text or secrets.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SELECT json_build_object(
  'observedAt',now(),
  'database',current_database(),'role',current_user,
  'readOnly',current_setting('transaction_read_only'),
  'version',current_setting('server_version'),
  'registry',(SELECT json_agg(x ORDER BY migration_name) FROM
    (SELECT migration_name,checksum,finished_at IS NOT NULL finished,rolled_back_at IS NOT NULL rolled_back FROM public._prisma_migrations) x),
  'counts',json_build_object(
    'guideRuns',(SELECT count(*) FROM public."ArboGuideRun"),
    'guideResults',(SELECT count(*) FROM public."ArboGuideRunResult"),
    'requests',(SELECT count(*) FROM public."Request"),
    'assignments',(SELECT count(*) FROM public."Assignment"),
    'handoffs',(SELECT count(*) FROM public."RequestAssignmentHandoff")),
  'invalidIndexes',(SELECT count(*) FROM pg_index WHERE (NOT indisvalid OR NOT indisready)
    AND indrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)),
  'unvalidatedConstraints',(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated),
  'unfinishedFinanceRuns',(SELECT count(*) FROM public."FinancialMaintenanceRun" WHERE "finishedAt" IS NULL),
  'activeOutboxLeases',(SELECT count(*) FROM public."NotificationOutbox" WHERE "leaseUntil">now()),
  'outbox',(SELECT json_agg(x) FROM (SELECT status,count(*) FROM public."NotificationOutbox" GROUP BY status) x),
  'walletMismatches',(SELECT count(*) FROM public."CreditAccount" a WHERE
    a.balance<>COALESCE((SELECT sum(t."totalDelta") FROM public."CreditTransaction" t WHERE t."creditAccountId"=a.id),0)
    OR a."reservedBalance"<>COALESCE((SELECT sum(t."reservedDelta") FROM public."CreditTransaction" t WHERE t."creditAccountId"=a.id),0)
    OR a."availableBalance"<>a.balance-a."reservedBalance"),
  'unfinishedClientTransactions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()
    AND backend_type='client backend' AND xact_start IS NOT NULL AND pid<>pg_backend_pid()),
  'ungrantedLocks',(SELECT count(*) FROM pg_locks WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND NOT granted),
  'learningTables',(SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'Learning%' AND relkind='r'),
  'examGuardExists',to_regprocedure('public.learning_question_is_editable(uuid)') IS NOT NULL
);
ROLLBACK;
