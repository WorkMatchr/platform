import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { contactRetentionFixture } from './fixtures/contact-retention-database'
import type { PrismaClient } from '../src/generated/prisma/client'

registerHooks({ resolve(s, c, next) { if (s === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }; return next(s, c) } })

// Fresh loopback database only. No migration deploy, provider call or existing database mutation.
const source = (() => {
  try {
    const value = new URL(process.env.DATABASE_URL ?? '')
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(value.hostname) && !value.search && !value.hash)
    assert.ok(['postgres:', 'postgresql:'].includes(value.protocol))
    return value
  } catch { throw new Error('LOOPBACK_SYNTHETIC_DATABASE_REQUIRED') }
})()
assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY && !process.env.JORTT_CLIENT_SECRET)
globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED') }
const suffix = randomUUID().replaceAll('-', '')
const name = `workmatchr_contact_purge_${suffix}`
const operator = `contact_purge_${suffix}`, app = `contact_app_${suffix}`
const password = randomBytes(32).toString('hex') // ephemeral synthetic credential, never output
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'
const target = new URL(source); target.pathname = `/${name}`
const admin = new Client({ connectionString: adminUrl.href })
await admin.connect()
let db: Client | undefined, op: Client | undefined, application: Client | undefined
let prisma: PrismaClient | undefined
let created = false, rolesCreated = false, groups = 0
const check = (label: string) => { groups++; console.log(`PASS ${label}`) }
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true
  db = new Client({ connectionString: target.href }); await db.connect()
  await admin.query(`BEGIN; CREATE ROLE "${operator}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}';
    CREATE ROLE "${app}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'; COMMIT;`)
  rolesCreated = true
  await db.query(contactRetentionFixture)
  const original = readFileSync(new URL('../prisma/migrations/20260720150000_add_marketplace_transaction_platform/migration.sql', import.meta.url), 'utf8')
  const guard = original.match(/CREATE OR REPLACE FUNCTION "workmatchr_prevent_marketplace_history_mutation"\(\)[\s\S]+?\$\$ LANGUAGE plpgsql;/)?.[0]
  assert.ok(guard); await db.query(guard)
  await db.query(`CREATE TRIGGER "MarketplaceAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "MarketplaceAuditEvent"
    FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();
    CREATE TABLE "CreditTransaction" (id uuid PRIMARY KEY, amount int);
    INSERT INTO "CreditTransaction" VALUES (gen_random_uuid(),25);
    CREATE TRIGGER "CreditTransaction_append_only_v2" BEFORE UPDATE OR DELETE ON "CreditTransaction"
    FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();`)
  const generalGuard = (await db.query(`SELECT pg_get_functiondef('workmatchr_prevent_marketplace_history_mutation'::regproc) AS value`)).rows[0].value
  const migration = readFileSync(new URL('../prisma/migrations/20261102120000_add_closed_contact_audit_retention/migration.sql', import.meta.url), 'utf8')
  await db.query(`ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO "${app}"`)
  await assert.rejects(db.query(migration), /CONTACT_AUDIT_RETENTION_UNSAFE_DEFAULT_PRIVILEGES/)
  await db.query('ROLLBACK')
  assert.equal((await db.query(`SELECT to_regnamespace('contact_audit_retention') AS value`)).rows[0].value, null)
  await db.query(`ALTER DEFAULT PRIVILEGES REVOKE SELECT ON TABLES FROM "${app}"`)
  await db.query(migration)
  assert.equal((await db.query(`SELECT pg_get_functiondef('workmatchr_prevent_marketplace_history_mutation'::regproc) AS value`)).rows[0].value, generalGuard)
  assert.equal((await db.query('SELECT count(*) FROM contact_audit_retention.approval')).rows[0].count, '0')
  check('unsafe default privileges roll back migration; clean install closed, history unchanged, zero approvals')
  const connect = async (role: string) => {
    const url = new URL(target); url.username = role; url.password = password
    const client = new Client({ connectionString: url.href }); await client.connect(); return client
  }
  op = await connect(operator); application = await connect(app)
  const run = (client: Client, id: string) => client.query('SELECT * FROM contact_audit_retention.purge($1)', [id])
  await assert.rejects(run(op, randomUUID()))
  await db.query(`GRANT USAGE ON SCHEMA contact_audit_retention TO "${operator}";
    GRANT EXECUTE ON FUNCTION contact_audit_retention.purge(uuid) TO "${operator}";
    GRANT USAGE ON SCHEMA public TO "${app}";
    GRANT SELECT, INSERT, UPDATE, DELETE ON "MarketplaceAuditEvent", "NotificationOutbox" TO "${app}";`)
  await assert.rejects(run(op, randomUUID()), /CONTACT_AUDIT_PURGE_CLOSED/)
  await assert.rejects(run(db, randomUUID()), /CONTACT_AUDIT_PURGE_FORBIDDEN/)
  await assert.rejects(run(application, randomUUID()))
  check('no PUBLIC execution; separate LOGIN required; absent approval, runtime and privileged owner refused')
  const actor = randomUUID(), policy = randomUUID(), hash = 'a'.repeat(64)
  type Pair = { id: string; entityId: string; hash: string }
  const insert = async (options: { age?: string; outcome?: string; action?: string; outbox?: string; entityId?: string; hash?: string } = {}): Promise<Pair> => {
    const id = randomUUID(), entityId = options.entityId ?? randomUUID(), outcome = options.outcome ?? 'ACCEPTED'
    const next = outcome === 'ACCEPTED' ? 'SENT' : 'FAILED'
    await db!.query(`INSERT INTO "MarketplaceAuditEvent" ("id","actorUserId","actorRole","action","entityType","entityId",
      "previousState","nextState","reason","correlationKey","metadata","createdAt")
      VALUES ($1,$2,'CONTACT_RECONCILIATION_OPERATOR',$3,'NotificationOutbox',$4,'FAILED',$5,$6,$7,$8,clock_timestamp()-$9::interval)`,
    [id, actor, options.action ?? 'CONTACT_RECONCILED', entityId, next,
      outcome === 'ACCEPTED' ? 'PROVIDER_ACCEPTANCE_PROVEN' : 'PROVIDER_REJECTION_PROVEN', `contact-reconcile:${entityId}`,
      JSON.stringify({ policyVersion: 'CONTACT_RECONCILIATION_V1', decisionHash: options.hash ?? hash, outcome }), options.age ?? '31 days'])
    if (options.outbox) await db!.query(`INSERT INTO "NotificationOutbox" ("id","eventId","channel","templateKey","payload","status","idempotencyKey")
      VALUES ($1::uuid,$1::text,'EMAIL','CONTACT_MESSAGE','{"redacted":true}',$2,$1::text)`, [entityId, options.outbox])
    return { id, entityId, hash: options.hash ?? hash }
  }
  const authorize = async (pairs: Pair[], who = operator, expired = false) => {
    const id = randomUUID()
    await db!.query(`INSERT INTO contact_audit_retention.approval
      (run_id,operator_oid,policy_reference,approved_at,expires_at,targets,register_reviewed,no_legal_hold)
      VALUES ($1,(SELECT oid FROM pg_roles WHERE rolname=$2),$3,clock_timestamp()-interval '5 minutes',
        clock_timestamp()+$4::interval,$5,true,true)`,
    [id, who, policy, expired ? '-1 minute' : '5 minutes', JSON.stringify(pairs.map(p => ({ auditId: p.id, decisionHash: p.hash })))])
    return id
  }
  const count = async (table: string) => (await db!.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number
  const snapshot = async () => JSON.stringify((await db!.query(`SELECT * FROM "MarketplaceAuditEvent" ORDER BY "id"`)).rows)
  const rejected = async (id: string) => { const before = await snapshot(); await assert.rejects(run(op!, id)); assert.equal(await snapshot(), before); assert.equal(await count('contact_audit_retention.permit'), 0) }
  const sent = await insert(), failed = await insert({ outcome: 'NOT_ACCEPTED' })
  await rejected(await authorize([sent], operator, true))
  await rejected(await authorize([sent], app))
  await rejected(await authorize([{ ...sent, hash: 'b'.repeat(64) }]))
  await rejected(await authorize([sent, sent]))
  await rejected(await authorize([await insert({ age: '719 hours' })]))
  check('expired/wrong operator, checksum, duplicate target and before 30-day boundary fail atomically')
  const boundary = await insert({ age: '720 hours' }), boundaryRun = await authorize([boundary])
  for (const change of ['register_reviewed=false', 'no_legal_hold=false', "expires_at=approved_at+interval '16 minutes'"]) {
    await assert.rejects(db.query(`UPDATE contact_audit_retention.approval SET ${change} WHERE run_id=$1`, [boundaryRun]))
  }
  assert.equal((await run(op, boundaryRun)).rows[0].deleted_count, 1)
  check('720 elapsed hours eligible; missing register/hold clearance and authorization beyond 15 minutes refused')
  for (const state of ['PENDING', 'PROCESSING', 'FAILED', 'SENT']) await rejected(await authorize([await insert({ outbox: state })]))
  await rejected(await authorize([await insert({ outcome: 'UNKNOWN' })]))
  const financial = await insert({ action: 'PAYMENT_RECORDED' })
  await rejected(await authorize([financial]))
  const financialBefore = (await db.query('SELECT * FROM "MarketplaceAuditEvent" WHERE "id"=$1', [financial.id])).rows
  check('all still-present outbox states, uncertainty and non-contact audit retained')
  const runId = await authorize([sent, failed])
  const outboxBefore = JSON.stringify((await db.query('SELECT * FROM "NotificationOutbox" ORDER BY "id"')).rows)
  const result = await run(op, runId)
  assert.equal(result.rows[0].deleted_count, 2)
  assert.deepEqual(Object.keys(result.rows[0]).sort(), ['completed_at', 'deleted_count', 'policy_reference', 'run_id'])
  assert.equal((await db.query('SELECT 1 FROM contact_audit_retention.approval WHERE run_id=$1', [runId])).rowCount, 0)
  assert.equal(await count('contact_audit_retention.permit'), 0)
  assert.deepEqual((await run(op, runId)).rows, result.rows)
  assert.deepEqual((await db.query('SELECT * FROM "MarketplaceAuditEvent" WHERE "id"=$1', [financial.id])).rows, financialBefore)
  assert.equal(JSON.stringify((await db.query('SELECT * FROM "NotificationOutbox" ORDER BY "id"')).rows), outboxBefore)
  check('proven SENT/rejected orphan audit removed; minimal receipt; approval removed; replay does not delete again')
  await assert.rejects(application.query('DELETE FROM "MarketplaceAuditEvent"'))
  await application.query(`SELECT set_config('workmatchr.contact_purge','true',false)`)
  await assert.rejects(application.query('DELETE FROM "MarketplaceAuditEvent"'))
  await assert.rejects(db.query('UPDATE "MarketplaceAuditEvent" SET "reason"=\'changed\''))
  await assert.rejects(db.query('DELETE FROM "CreditTransaction"'))
  await assert.rejects(db.query('UPDATE "CreditTransaction" SET amount=0'))
  await assert.rejects(op.query('INSERT INTO contact_audit_retention.permit VALUES ($1,pg_backend_pid(),txid_current())', [financial.id]))
  await assert.rejects(op.query('DELETE FROM "MarketplaceAuditEvent"'))
  check('ordinary deletion/update, forged GUC/capability refused; financial append-only protection intact')
  const beforeMixed = await insert()
  await rejected(await authorize([beforeMixed, financial]))
  const fault = await insert(), faultRun = await authorize([fault])
  await db.query(`CREATE FUNCTION test_receipt_failure() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'synthetic_receipt_failure'; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER test_receipt_failure BEFORE INSERT ON contact_audit_retention.receipt FOR EACH ROW EXECUTE FUNCTION test_receipt_failure()`)
  await rejected(faultRun)
  assert.equal((await db.query('SELECT 1 FROM contact_audit_retention.approval WHERE run_id=$1', [faultRun])).rowCount, 1)
  await db.query('DROP TRIGGER test_receipt_failure ON contact_audit_retention.receipt')
  assert.equal((await run(op, faultRun)).rows[0].deleted_count, 1)
  check('mixed batch and receipt fault roll back deletion and capability; same authorized run recovers')
  const rollback = await insert(), rollbackRun = await authorize([rollback])
  await op.query('BEGIN'); await run(op, rollbackRun); await op.query('ROLLBACK')
  assert.equal((await db.query('SELECT 1 FROM "MarketplaceAuditEvent" WHERE "id"=$1', [rollback.id])).rowCount, 1)
  assert.equal((await run(op, rollbackRun)).rows[0].deleted_count, 1)
  check('caller rollback retains audit and authorization; retry succeeds once')
  const racing = await insert(), raceId = await authorize([racing])
  const clients = await Promise.all(Array.from({ length: 6 }, () => connect(operator)))
  try {
    const results = await Promise.allSettled(clients.map(c => run(c, raceId)))
    for (const r of results) if (r.status === 'rejected') assert.match(String(r.reason), /CONTACT_AUDIT_PURGE_BUSY/)
    assert.ok(results.some(r => r.status === 'fulfilled'))
    assert.equal((await run(op, raceId)).rows[0].deleted_count, 1)
    assert.equal((await db.query('SELECT 1 FROM contact_audit_retention.receipt WHERE run_id=$1', [raceId])).rowCount, 1)
  } finally { await Promise.all(clients.map(c => c.end())) }
  check('six simultaneous purges: one receipt/deletion, safe busy refusal or idempotent receipt')
  const locked = await insert(), lockedRun = await authorize([locked])
  await db.query('BEGIN'); await db.query('SELECT pg_advisory_xact_lock(310034)')
  await assert.rejects(run(op, lockedRun), /CONTACT_AUDIT_PURGE_BUSY/); await db.query('ROLLBACK')
  await db.query('BEGIN'); await db.query('SELECT 1 FROM "MarketplaceAuditEvent" WHERE "id"=$1 FOR UPDATE', [locked.id])
  await assert.rejects(run(op, lockedRun), /could not obtain lock/); await db.query('ROLLBACK')
  assert.equal((await run(op, lockedRun)).rows[0].deleted_count, 1)
  check('admission/retention advisory lock and concurrent row processing exclude purge, safe recovery')
  const late = await insert({ age: '90 days' }), lateRun = await authorize([late], operator, true)
  await rejected(lateRun)
  const beforePreflight = await snapshot()
  const preflight = await db.query(readFileSync(new URL('../ops/contact-audit-retention/check.sql', import.meta.url), 'utf8'))
  assert.ok(Array.isArray(preflight))
  assert.ok(Number(preflight[1].rows[0].requires_individual_review) > 0)
  assert.equal(await snapshot(), beforePreflight)
  assert.equal((await run(op, await authorize([late]))).rows[0].deleted_count, 1)
  check('outage does not silently renew approval; overdue preflight reads only; fresh approval recovers')
  await db.query(`CREATE TABLE "User" ("id" uuid PRIMARY KEY, "status" text, "platformRole" text, "emailVerified" boolean);
    CREATE TABLE "Session" ("id" uuid PRIMARY KEY, "userId" uuid REFERENCES "User", "expiresAt" timestamptz,
      "impersonatedUserId" uuid, "impersonationStartedAt" timestamptz);
    CREATE TABLE "Organization" ("id" uuid PRIMARY KEY, "status" text, "organizationType" text, "systemKey" text);
    CREATE TABLE "OrganizationMembership" ("id" uuid PRIMARY KEY, "userId" uuid REFERENCES "User",
      "organizationId" uuid REFERENCES "Organization", "status" text, "role" text);`)
  const session = randomUUID(), organization = randomUUID()
  await db.query(`INSERT INTO "User" VALUES ($1,'ACTIVE','ADMIN',true)`, [actor])
  await db.query(`INSERT INTO "Session" VALUES ($1,$2,now()+interval '1 day',NULL,NULL)`, [session, actor])
  await db.query(`INSERT INTO "Organization" VALUES ($1,'ACTIVE','PLATFORM_OPERATOR','WORKMATCHR_PLATFORM')`, [organization])
  await db.query(`INSERT INTO "OrganizationMembership" VALUES ($1,$2,$3,'ACTIVE','OWNER')`, [randomUUID(), actor, organization])
  process.env.DATABASE_URL = target.href
  process.env.CONTACT_RECONCILIATION_ENABLED = 'true'
  process.env.CONTACT_RECONCILIATION_OPERATOR_IDS = actor
  process.env.CONTACT_FORM_ENABLED = 'false'; process.env.CONTACT_OUTBOX_ENABLED = 'false'
  const { getPrisma } = await import('../src/lib/prisma'); prisma = getPrisma()
  const { reconcileContact } = await import('../src/lib/contact/contact-reconciliation')
  const { reconciliationInput } = await import('../src/lib/contact/contact-reconciliation-policy')
  const decision = reconciliationInput.parse({ confirmation: 'RECONCILE_WITHOUT_RESENDING', outboxId: randomUUID(),
    decisionId: randomUUID(), evidenceId: randomUUID(), evidenceSha256: hash,
    evidenceObservedAt: new Date(Date.now() - 32 * 86400000).toISOString(), outcome: 'ACCEPTED',
    reason: 'PROVIDER_ACCEPTANCE_PROVEN', providerMessageId: randomUUID(), expectedAttemptCount: 1, expectedFingerprint: hash })
  const historical = await insert({ entityId: decision.outboxId, hash: createHash('sha256').update(JSON.stringify(decision)).digest('hex') })
  const identity = { userId: actor, sessionId: session }
  assert.equal((await reconcileContact(identity, decision)).repeated, true)
  await run(op, await authorize([historical]))
  const afterPurge = await snapshot(), outboxCount = await count('"NotificationOutbox"')
  await assert.rejects(reconcileContact(identity, decision), /CONTACT_RECONCILIATION_CONFLICT/)
  assert.equal(await snapshot(), afterPurge); assert.equal(await count('"NotificationOutbox"'), outboxCount)
  check('real reconciliation service replay after audit purge refuses; no new outbox/audit/send')
  // Temporary-name shadowing cannot redirect any qualified table access.
  await op.query('CREATE TEMP TABLE permit(audit_id uuid); CREATE TEMP TABLE approval(run_id uuid)')
  const shadow = await insert()
  assert.equal((await run(op, await authorize([shadow]))).rows[0].deleted_count, 1)
  await db.query(`GRANT INSERT ON contact_audit_retention.permit TO "${operator}"`)
  await assert.rejects(run(op, runId), /CONTACT_AUDIT_PURGE_FORBIDDEN/)
  await db.query(`REVOKE INSERT ON contact_audit_retention.permit FROM "${operator}"`)
  await db.query(`GRANT INSERT(audit_id) ON contact_audit_retention.permit TO "${operator}"`)
  await assert.rejects(run(op, runId), /CONTACT_AUDIT_PURGE_FORBIDDEN/)
  await db.query(`REVOKE INSERT(audit_id) ON contact_audit_retention.permit FROM "${operator}"`)
  await db.query(`GRANT "${app}" TO "${operator}"`)
  await assert.rejects(run(op, runId), /CONTACT_AUDIT_PURGE_FORBIDDEN/)
  await db.query(`REVOKE "${app}" FROM "${operator}"`)
  await db.query(`REVOKE EXECUTE ON FUNCTION contact_audit_retention.purge(uuid) FROM "${operator}"`)
  await assert.rejects(run(op, runId))
  check('search-path shadowing ineffective; excess privileges and withdrawn execution rights fail closed')
  console.log(`CONTACT_AUDIT_RETENTION_DATABASE_PASS groups=${groups} temporaryMigration=1 externalCalls=0`)
} finally {
  await prisma?.$disconnect()
  await op?.end(); await application?.end(); await db?.end()
  if (created) {
    assert.match(name, /^workmatchr_contact_purge_[a-f0-9]{32}$/)
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name])
    await admin.query(`DROP DATABASE "${name}"`)
  }
  if (rolesCreated) await admin.query(`DROP ROLE "${operator}"; DROP ROLE "${app}"`)
  await admin.end()
  console.log('CONTACT_AUDIT_RETENTION_OWN_DATABASE_AND_ROLES_REMOVED')
}
