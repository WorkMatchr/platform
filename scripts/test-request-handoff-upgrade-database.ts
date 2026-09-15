import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Client } from 'pg'
import { expertiseSpecialismSlugs } from '../src/lib/requests/expertise-specialism-reference'

const source = new URL(process.env.DATABASE_URL!)
if (!['localhost', '127.0.0.1'].includes(source.hostname)) throw Error('Local database required')
const migration = '20260915090000_request_assignment_handoff'
const sql = readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8')
const bootstrap = sql.slice(sql.indexOf('CREATE TEMP TABLE'), sql.indexOf('-- END CANONICAL BOOTSTRAP'))
const terms = [...bootstrap.matchAll(/\('([^']+)','([^']+)',\d+\)/g)].map(m => [m[1]!, m[2]!])
assert.deepEqual(terms.map(t => t[0]).sort(), Object.values(expertiseSpecialismSlugs).sort())
assert.equal(terms.length, 20)
const checksum = createHash('sha256').update(JSON.stringify(terms)).digest('hex')
const base = new URL(source); base.pathname = '/postgres'
const admin = new Client({ connectionString: base.toString() })

async function scenario(kind: 'legacy' | 'partial' | 'full' | 'v2' | 'collision') {
  const name = `workmatchr_handoff_upgrade_${process.pid}_${Date.now()}_${kind}`
  const target = new URL(source); target.pathname = `/${name}`
  const directory = mkdtempSync(join(tmpdir(), 'workmatchr-bootstrap-'))
  const migrations = join(directory, 'migrations')
  const config = join(directory, 'prisma.config.mjs')
  writeFileSync(config, `export default ${JSON.stringify({ schema: resolve('prisma/schema.prisma'), migrations: { path: migrations }, datasource: { url: target.toString() } })}`)
  const db = new Client({ connectionString: target.toString() })
  function deploy() {
    const result = spawnSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--config', config], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: target.toString() } })
    assert.equal(result.status, 0, 'Local migrate deploy failed: ' + (result.stderr + result.stdout).replaceAll(target.toString(), '[LOCAL_DATABASE]'))
  }
  try {
    await admin.query(`CREATE DATABASE "${name}"`)
    for (const entry of readdirSync('prisma/migrations').filter(n => /^\d/.test(n) && n < migration)) cpSync(`prisma/migrations/${entry}`, join(migrations, entry), { recursive: true })
    cpSync('prisma/migrations/migration_lock.toml', join(migrations, 'migration_lock.toml'))
    deploy()
    await db.connect()
    assert.equal((await db.query('SELECT count(*)::int n FROM "Specialism"')).rows[0].n, 4)
    assert.equal((await db.query(`SELECT count(*)::int n FROM "ProviderTaxonomy" WHERE kind='SPECIALISM'`)).rows[0].n, 0)
    const initial = kind === 'partial' ? terms.filter(t => ['arbeids-en-organisatiedeskundige','ergonoom','bedrijfsarts','arbodienst','middelbare-veiligheidskundige','hogere-veiligheidskundige','arbeidshygienist','machineveiligheid','brandveiligheid'].includes(t[0])) : kind === 'full' ? terms : []
    for (const [slug,label] of initial) await db.query('INSERT INTO "Specialism" (slug,name,"updatedAt") VALUES($1,$2,NOW()) ON CONFLICT(slug) DO NOTHING',[slug,label])
    let oldVersion: string | undefined
    if (kind === 'v2') {
      const seed = readFileSync('prisma/seed.ts','utf8')
      const section = seed.slice(seed.indexOf('const specialismsV1'),seed.indexOf('const certifications'))
      const oldTerms = [...section.matchAll(/\['([^']+)', '([^']+)', (?:null|'[^']+')\]/g)].slice(0,17).map(m=>[m[1]!,m[2]!])
      for (const [slug,label] of oldTerms) await db.query('INSERT INTO "Specialism" (slug,name,"updatedAt") VALUES($1,$2,NOW()) ON CONFLICT(slug) DO NOTHING',[slug,label])
      const tid=(await db.query(`INSERT INTO "ProviderTaxonomy" (kind,code,name) VALUES('SPECIALISM','SPECIALISM','SPECIALISM') RETURNING id`)).rows[0].id
      oldVersion=(await db.query(`INSERT INTO "ProviderTaxonomyVersion" ("taxonomyId",version,status,checksum,"publishedAt") VALUES($1,2,'PUBLISHED',$2,NOW()) RETURNING id`,[tid,createHash('sha256').update(JSON.stringify(oldTerms)).digest('hex')])).rows[0].id
      for (const [i,[code,label]] of oldTerms.entries()) await db.query('INSERT INTO "ProviderTaxonomyTerm" ("versionId",code,label,"sortOrder") VALUES($1,$2,$3,$4)',[oldVersion,code,label,i])
      await db.query('INSERT INTO "ProviderSpecialismTaxonomyMap" ("termId","specialismId") SELECT t.id,s.id FROM "ProviderTaxonomyTerm" t JOIN "Specialism" s ON s.slug=t.code WHERE t."versionId"=$1',[oldVersion])
    }
    if (kind === 'collision') {
      await db.query(`INSERT INTO "Specialism" (slug,name,"updatedAt") VALUES('ambiguous-ergonomist','Ergonoom',NOW())`)
      await assert.rejects(db.query('BEGIN;'+bootstrap+'COMMIT;'), /identity collision/)
      await db.query('ROLLBACK')
      assert.equal((await db.query(`SELECT count(*)::int n FROM "ProviderTaxonomy" WHERE kind='SPECIALISM'`)).rows[0].n,0)
      console.log('Collision: fail closed, no partial bootstrap PASS')
      return
    }
    const before=(await db.query('SELECT * FROM "Specialism" ORDER BY slug')).rows
    const org=(await db.query(`INSERT INTO "Organization" (name,"organizationType","updatedAt") VALUES('Bootstrap fixture','PROVIDER',NOW()) RETURNING id`)).rows[0].id
    const profile=(await db.query('INSERT INTO "ProviderProfile" ("organizationId","updatedAt") VALUES($1,NOW()) RETURNING id',[org])).rows[0].id
    for (const row of before) await db.query('INSERT INTO "ProviderSpecialism" ("providerProfileId","specialismId","updatedAt") VALUES($1,$2,NOW())',[profile,row.id])
    const links=(await db.query('SELECT * FROM "ProviderSpecialism" ORDER BY id')).rows
    cpSync(`prisma/migrations/${migration}`,join(migrations,migration),{recursive:true})
    deploy()
    const after=(await db.query('SELECT * FROM "Specialism" ORDER BY slug')).rows
    for (const row of before) assert.deepEqual(after.find(a=>a.id===row.id),row)
    assert.deepEqual((await db.query('SELECT * FROM "ProviderSpecialism" ORDER BY id')).rows,links)
    const mappings=(await db.query(`SELECT s.id,s.slug,t.code,t.label,t.id AS "termId",v.id AS "versionId",v.checksum FROM "Specialism" s JOIN "ProviderSpecialismTaxonomyMap" m ON m."specialismId"=s.id JOIN "ProviderTaxonomyTerm" t ON t.id=m."termId" JOIN "ProviderTaxonomyVersion" v ON v.id=t."versionId" WHERE v.version=3 ORDER BY s.slug`)).rows
    assert.equal(mappings.length,20)
    assert.deepEqual(mappings.map(m=>m.slug).sort(),Object.values(expertiseSpecialismSlugs).sort())
    for (const m of mappings) { assert.equal(m.slug,m.code); assert.equal(m.checksum,checksum) }
    if (oldVersion) { assert.equal((await db.query('SELECT count(*)::int n FROM "ProviderTaxonomyTerm" WHERE "versionId"=$1',[oldVersion])).rows[0].n,17); assert.equal((await db.query('SELECT status FROM "ProviderTaxonomyVersion" WHERE id=$1',[oldVersion])).rows[0].status,'RETIRED') }
    assert.equal((await db.query(`SELECT count(*)::int n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`)).rows[0].n,79)
    assert.equal((await db.query(`SELECT count(*)::int n FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL`)).rows[0].n,0)
    assert.equal((await db.query('SELECT count(*)::int n FROM "RequestAssignmentHandoff"')).rows[0].n,0)
    assert.equal((await db.query('SELECT count(*)::int n FROM "Assignment"')).rows[0].n,0)
    const snapshot=JSON.stringify((await db.query('SELECT * FROM "ProviderTaxonomyTerm" ORDER BY id')).rows)
    await db.query('BEGIN;'+bootstrap+'COMMIT;')
    deploy()
    assert.equal(JSON.stringify((await db.query('SELECT * FROM "ProviderTaxonomyTerm" ORDER BY id')).rows),snapshot)
    assert.deepEqual((await db.query('SELECT * FROM "Specialism" ORDER BY slug')).rows,after)
    console.log(`${kind}: migrate deploy 79/79, canonical 20/20, references/UUIDs/FKs preserved, repeat unchanged, handoff schema PASS`)
  } finally {
    await db.end()
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[name])
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`)
    if (!resolve(directory).startsWith(resolve(tmpdir())+'\\') && !resolve(directory).startsWith(resolve(tmpdir())+'/')) throw Error('Unsafe temporary path')
    rmSync(directory,{recursive:true,force:true})
  }
}
async function main() { await admin.connect(); try { for (const kind of ['legacy','partial','full','v2','collision'] as const) await scenario(kind) } finally { await admin.end() } }
main().catch(error=>{console.error(error);process.exitCode=1})
