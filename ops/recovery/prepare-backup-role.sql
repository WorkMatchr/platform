-- NOT a migration. Future operator proposal; requires separate production authorization.
-- psql stops before writes unless both explicit variables have been provided.
\set ON_ERROR_STOP on
\if :{?d2c_provision_authorized}
\else
  DO $$ BEGIN RAISE EXCEPTION 'D2C provisioning not authorized'; END $$;
\endif
\if :d2c_provision_authorized
\else
  DO $$ BEGIN RAISE EXCEPTION 'D2C provisioning not authorized'; END $$;
\endif
\if :{?backup_role}
\else
  DO $$ BEGIN RAISE EXCEPTION 'D2C backup role must be explicit'; END $$;
\endif
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $d2c_preconditions$
BEGIN
  IF EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relrowsecurity)
     OR EXISTS (SELECT FROM pg_largeobject_metadata)
     OR EXISTS (SELECT FROM pg_foreign_table)
     OR EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND p.prosecdef)
  THEN RAISE EXCEPTION 'D2C backup scope requires separate privilege review'; END IF;
END
$d2c_preconditions$;
CREATE ROLE :"backup_role" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE :"backup_role" SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE :"DBNAME" TO :"backup_role";
SELECT format('GRANT USAGE ON SCHEMA %I TO %I',nspname,:'backup_role')
FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY nspname \gexec
SELECT format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I',nspname,:'backup_role')
FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY nspname \gexec
SELECT format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I',nspname,:'backup_role')
FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY nspname \gexec
COMMIT;
-- NOLOGIN is intentional. Credential provisioning/expiry and LOGIN require a separate
-- approved operator step. No password is generated, returned or embedded here.
-- No default privileges: recheck object coverage at T0; do not grant future access.
