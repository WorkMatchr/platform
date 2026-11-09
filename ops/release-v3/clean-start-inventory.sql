-- psql -X -v ON_ERROR_STOP=1. Only for the disposable V3 acceptance database.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
DO $guard$
BEGIN
  IF current_database() !~ '^workmatchr_b4_[0-9a-f]{12}$'
     OR current_setting('transaction_read_only') <> 'on' THEN
    RAISE EXCEPTION 'Synthetic rehearsal database required';
  END IF;
END
$guard$;

-- No identifiers, addresses, balances or provider references leave the fixture.
SELECT (SELECT count(*) FROM "User") AS accounts,
       (SELECT count(*) FROM "Organization") AS organizations,
       (SELECT count(*) FROM "ProfessionalSubscription") AS subscriptions_to_review,
       (SELECT count(*) FROM "CreditAccount" WHERE balance <> 0 OR "reservedBalance" <> 0) AS wallets_to_review,
       (SELECT count(*) FROM "FinancialPaymentEvent") AS payment_events_to_preserve,
       (SELECT count(*) FROM "FinancialInvoice") AS invoices_to_preserve,
       (SELECT count(*) FROM "FinancialJorttSync") AS accounting_links_to_preserve,
       (SELECT count(*) FROM "ProviderQualificationDecision") AS decisions_to_preserve;

-- Actual foreign keys form the dependency inventory. Include dependencies
-- in both directions, even when a newly added table has no known business classification.
SELECT c.conrelid::regclass::text AS dependent_table,
       c.confrelid::regclass::text AS referenced_table, c.conname AS constraint_name,
       c.convalidated AS validated
FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON c.connamespace = n.oid
WHERE c.contype = 'f' AND n.nspname = 'public'
ORDER BY 1, 2, 3;
ROLLBACK;
