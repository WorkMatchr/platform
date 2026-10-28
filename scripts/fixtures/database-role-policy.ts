import assert from 'node:assert/strict'
import type { Client } from 'pg'
import { PREVIEW_IDENTITY_SQL } from '../../src/lib/maintenance/preview-database-pool'

// Executable candidate policy, only callable against the database this harness
// just created. It is NOT a production grant/provisioning command.
export async function configureSyntheticRoles(db: Client, runtime: string, diagnostic: string) {
  const name = (await db.query('SELECT current_database() AS name')).rows[0].name as string
  assert.match(name, /^workmatchr_db02_fresh_\d+_\d+$/)
  for (const role of [runtime, diagnostic]) assert.match(role, /^wp17_(runtime|diagnostic)_\d+_\d+$/)
  await db.query(`REVOKE CREATE, TEMPORARY ON DATABASE "${name}" FROM PUBLIC`)
  await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
  await db.query(`GRANT CONNECT ON DATABASE "${name}" TO "${runtime}", "${diagnostic}"`)
  await db.query(`GRANT USAGE ON SCHEMA public TO "${runtime}", "${diagnostic}"`)
  const tables = (await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`)).rows
  for (const { tablename } of tables) {
    assert.match(tablename, /^[A-Za-z0-9_]+$/)
    await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON public."${tablename}" TO "${runtime}"`)
  }
  await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${runtime}"`)
  await db.query(`GRANT EXECUTE ON FUNCTION public.learning_question_is_editable(uuid) TO "${runtime}"`)
  await db.query(`GRANT SELECT ON public._prisma_migrations TO "${diagnostic}"`)
}

export async function assertSyntheticRoles(db: Client, runtime: string, diagnostic: string) {
  for (const role of [runtime, diagnostic]) assert.match(role, /^wp17_(runtime|diagnostic)_\d+_\d+$/)
  const capabilities = (await db.query(`SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolcanlogin
    FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname`, [[runtime, diagnostic]])).rows
  assert.equal(capabilities.length, 2)
  for (const row of capabilities) for (const key of ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolreplication', 'rolbypassrls', 'rolcanlogin']) assert.equal(row[key], false)
  let rejected = 0
  const deny = async (sql: string) => {
    await assert.rejects(db.query(sql), (error: { code?: string }) => error.code === '42501')
    rejected++
  }
  await db.query(`SET ROLE "${runtime}"`)
  try {
    // Run the actual connection guard's metadata SQL on PostgreSQL (no mocked SQL).
    const row = (await db.query(PREVIEW_IDENTITY_SQL)).rows[0]
    assert.equal(row.role, runtime)
    for (const key of ['privileged', 'memberships', 'database_create', 'schema_create', 'owns_objects', 'registry_write']) assert.equal(row[key], false, key)
    await db.query('SELECT id FROM "User" LIMIT 1')
    await deny('SELECT * FROM _prisma_migrations')
    await deny("UPDATE _prisma_migrations SET checksum=checksum WHERE false")
    await deny('CREATE TABLE public.wp17_forbidden(id int)')
    await deny('CREATE SCHEMA wp17_forbidden')
    await deny('CREATE TEMP TABLE wp17_forbidden(id int)')
    await deny('ALTER TABLE "User" DISABLE TRIGGER ALL')
    await deny('TRUNCATE "NotificationOutbox"')
    await deny('SET session_replication_role=replica')
    await deny('CREATE ROLE wp17_forbidden_role')
    // Real Prisma model DML, no account credentials or actual user creation.
    await db.query('BEGIN')
    try {
      await db.query(`INSERT INTO "RateLimit" (id,key,count,"lastRequest") VALUES ('00000000-0000-4000-8000-000000000017','wp17-synthetic-role',1,1)`)
      await db.query(`UPDATE "RateLimit" SET count=2 WHERE key='wp17-synthetic-role'`)
      assert.equal((await db.query(`SELECT count FROM "RateLimit" WHERE key='wp17-synthetic-role'`)).rows[0].count, 2)
      await db.query(`DELETE FROM "RateLimit" WHERE key='wp17-synthetic-role'`)
    } finally { await db.query('ROLLBACK') }
  } finally { await db.query('RESET ROLE') }
  await db.query(`SET ROLE "${diagnostic}"`)
  try {
    assert.equal((await db.query('SELECT count(*)::int AS n FROM _prisma_migrations')).rows[0].n, 93)
    await db.query('SELECT current_database(),current_user FROM pg_catalog.pg_roles WHERE rolname=current_user')
    await deny('SELECT * FROM "User"')
    await deny('SELECT * FROM "Session"')
    await deny('UPDATE _prisma_migrations SET checksum=checksum WHERE false')
    await deny('CREATE TABLE public.wp17_forbidden(id int)')
  } finally { await db.query('RESET ROLE') }
  console.log(`WP17 ROLE PASS: runtime DML, diagnostic metadata/registry only, ${rejected} forbidden operations; no DDL/TRUNCATE/role/registry write or memberships`)
}

export async function roleAclSnapshot(db: Client) {
  return (await db.query(`SELECT c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.relacl::text
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname`)).rows
}
