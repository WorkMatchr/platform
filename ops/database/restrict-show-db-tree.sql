-- Manual, separately authorized maintenance only. NOT a Prisma migration.
-- Preconditions: confirmed database identity, owner session, captured effective ACL.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5s';
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid = pg_catalog.to_regprocedure('public.show_db_tree()')
      AND proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)
      AND NOT prosecdef
      AND md5(prosrc) = '2dc5cdeafbbc8d0c82c8db059c0e25e5'
  ) THEN
    RAISE EXCEPTION 'STOP: unexpected helper identity, owner or definition';
  END IF;
END;
$guard$;
REVOKE EXECUTE ON FUNCTION public.show_db_tree() FROM PUBLIC;
COMMIT;
