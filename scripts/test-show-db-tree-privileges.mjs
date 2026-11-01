import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

async function main() {
  let source
  try {
    source = new URL(process.env.DATABASE_URL ?? '')
    assert.ok(['postgres:', 'postgresql:'].includes(source.protocol))
    assert.ok(['localhost', '127.0.0.1'].includes(source.hostname))
    assert.equal(source.port, '5432')
    assert.ok([...source.searchParams.keys()].every(key => ['schema', 'connection_limit', 'pool_timeout'].includes(key)))
  } catch { throw new Error('LOOPBACK_DATABASE_REQUIRED') }
  source.pathname = '/postgres'
  const admin = new Client({ connectionString: source.toString(), connectionTimeoutMillis: 5000 })
  await admin.connect()
  const suffix = `${process.pid}_${Date.now()}`
  const name = `db05_helper_${suffix}`
  const outsider = `db05_outsider_${suffix}`
  const operator = `db05_operator_${suffix}`
  const beforeDb = (await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows
  const beforeRoles = (await admin.query('SELECT rolname FROM pg_roles ORDER BY rolname')).rows
  const apply = readFileSync('ops/database/restrict-show-db-tree.sql', 'utf8')
  const restore = readFileSync('ops/database/restore-show-db-tree-public-execute.sql', 'utf8')
  let created = false, db
  const roles = []
  try {
    await admin.query(`CREATE DATABASE "${name}"`); created = true
    for (const role of [outsider, operator]) {
      await admin.query(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`)
      roles.push(role)
    }
    const target = new URL(source); target.pathname = `/${name}`
    db = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 }); await db.connect()
    const sourceCode = readFileSync('src/lib/maintenance/database-identity.ts', 'utf8')
    const metadataQuery = sourceCode.match(/acquired\.query<Identity>\(\{ text: `([\s\S]*?)`, query_timeout: 5000/)
    assert.ok(metadataQuery, 'Exact runtime diagnostic SQL must be found before the PostgreSQL test')
    const metadataSql = metadataQuery[1]
    await db.query('BEGIN READ ONLY')
    await db.query("SET LOCAL neon.endpoint_id = 'ep-synthetic'")
    await db.query("SET LOCAL neon.branch_id = 'br-synthetic'")
    const observed = (await db.query(metadataSql)).rows
    assert.equal(observed.length, 1)
    assert.equal(observed[0].database_name, name)
    assert.equal(observed[0].endpoint_id, 'ep-synthetic')
    assert.equal(observed[0].branch_id, 'br-synthetic')
    assert.equal(observed[0].read_only, 'on')
    await assert.rejects(db.query('CREATE TABLE should_never_exist(id int)'), error => error.code === '25006')
    await db.query('ROLLBACK')
    console.log('PASS: exact diagnostic SQL works in PostgreSQL read-only transaction; attempted write denied')
    async function rejects(sql, code) {
      await assert.rejects(db.query(sql), error => error.code === code)
      await db.query('ROLLBACK')
    }
    await rejects(apply, 'P0001') // Missing function must not be silently accepted.
    // JSON preserves the inspected body's whitespace and checksum across Git checkouts.
    await db.query(JSON.parse(readFileSync('scripts/fixtures/show-db-tree.json', 'utf8')).sql)
    assert.equal((await db.query("SELECT md5(prosrc) AS hash FROM pg_proc WHERE oid='public.show_db_tree()'::regprocedure")).rows[0].hash, '2dc5cdeafbbc8d0c82c8db059c0e25e5')
    await db.query(`GRANT USAGE ON SCHEMA public TO "${outsider}", "${operator}"`)
    await db.query(`GRANT EXECUTE ON FUNCTION public.show_db_tree() TO "${operator}"`)
    await db.query('CREATE TABLE public.db05_private (payload text)')
    await db.query("INSERT INTO public.db05_private VALUES ('synthetic-only')")
    const definition = async () => (await db.query("SELECT oid, proowner, prosrc, prosecdef, provolatile, proconfig FROM pg_proc WHERE oid='public.show_db_tree()'::regprocedure")).rows
    const acl = async () => (await db.query("SELECT a.grantee,a.privilege_type,a.is_grantable FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='public.show_db_tree()'::regprocedure ORDER BY a.grantee,a.privilege_type")).rows
    const originalDefinition = await definition(), originalAcl = await acl()
    await db.query(`SET ROLE "${outsider}"`)
    assert.ok((await db.query("SELECT count(*)::int n FROM public.show_db_tree() WHERE tree_structure LIKE '%db05_private%'")).rows[0].n > 0)
    await rejects('SELECT * FROM public.db05_private', '42501')
    await rejects(apply, 'P0001') // Not the owner: no changes.
    await db.query('RESET ROLE')
    assert.deepEqual(await acl(), originalAcl)
    await db.query(apply); await db.query(apply)
    assert.deepEqual(await definition(), originalDefinition)
    assert.deepEqual(await acl(), originalAcl.filter(item => item.grantee !== 0))
    await db.query(`SET ROLE "${outsider}"`)
    await rejects('SELECT * FROM public.show_db_tree()', '42501')
    await db.query('RESET ROLE')
    await db.query(`SET ROLE "${operator}"`)
    await db.query('SELECT count(*) FROM public.show_db_tree()')
    await db.query('RESET ROLE')
    await db.query('SELECT count(*) FROM public.show_db_tree()')
    await db.query(restore)
    assert.deepEqual(await acl(), originalAcl)
    assert.deepEqual(await definition(), originalDefinition)
    await db.query('ALTER FUNCTION public.show_db_tree() SECURITY DEFINER')
    await rejects(apply, 'P0001')
    assert.deepEqual(await acl(), originalAcl)
    console.log('PASS: absent/non-owner/changed helper denied; exact PUBLIC-only revoke is idempotent; owner/named operator retained; outsider denied; rollback restores effective ACL; definition unchanged')
  } finally {
    if (db) await db.end()
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`)
    for (const role of roles) await admin.query(`DROP ROLE "${role}"`)
    assert.deepEqual((await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows, beforeDb)
    assert.deepEqual((await admin.query('SELECT rolname FROM pg_roles ORDER BY rolname')).rows, beforeRoles)
    await admin.end()
    console.log('CLEANUP PASS: only owned synthetic database/roles removed; pre-existing inventories unchanged')
  }
}

main().catch(() => { console.error('Synthetic helper privilege test failed; no connection details logged'); process.exitCode = 1 })
