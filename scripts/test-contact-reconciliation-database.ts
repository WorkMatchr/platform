import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { contactRetentionFixture } from './fixtures/contact-retention-database'
import type { PrismaClient } from '../src/generated/prisma/client'

registerHooks({ resolve(s, c, next) { if (s === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }; return next(s, c) } })
const source = new URL(process.env.DATABASE_URL ?? '')
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(source.hostname) && !source.search)
assert.ok(['postgres:', 'postgresql:'].includes(source.protocol))
assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY && !process.env.JORTT_CLIENT_SECRET)
globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED') }
const name = `workmatchr_contact_reconcile_${randomUUID().replaceAll('-', '')}`
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'
const target = new URL(source); target.pathname = `/${name}`
const admin = new Client({ connectionString: adminUrl.href }); await admin.connect()
let sql: Client | undefined, db: PrismaClient | undefined, created = false, cases = 0
const check = (label: string) => { cases++; console.log(`PASS ${label}`) }
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true
  sql = new Client({ connectionString: target.href }); await sql.connect()
  await sql.query(contactRetentionFixture)
  // Only the existing columns used by the service; no migrations or copied data.
  await sql.query(`CREATE TABLE "User" ("id" uuid PRIMARY KEY, "email" text, "status" text, "platformRole" text, "emailVerified" boolean);
    CREATE TABLE "Session" ("id" uuid PRIMARY KEY, "userId" uuid REFERENCES "User", "expiresAt" timestamptz,
      "impersonatedUserId" uuid, "impersonationStartedAt" timestamptz);
    CREATE TABLE "Organization" ("id" uuid PRIMARY KEY, "status" text, "organizationType" text, "systemKey" text);
    CREATE TABLE "OrganizationMembership" ("id" uuid PRIMARY KEY, "userId" uuid REFERENCES "User",
      "organizationId" uuid REFERENCES "Organization", "status" text, "role" text);
    ALTER TABLE "MarketplaceAuditEvent" ADD FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT;`)
  const migration = readFileSync(new URL('../prisma/migrations/20260720150000_add_marketplace_transaction_platform/migration.sql', import.meta.url), 'utf8')
  const immutable = migration.match(/CREATE OR REPLACE FUNCTION "workmatchr_prevent_marketplace_history_mutation"\(\)[\s\S]+?\$\$ LANGUAGE plpgsql;/)?.[0]
  assert.ok(immutable)
  await sql.query(immutable)
  await sql.query(`CREATE TRIGGER "MarketplaceAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "MarketplaceAuditEvent"
    FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"()`)
  process.env.DATABASE_URL = target.href
  process.env.CONTACT_FORM_ENABLED = 'false'; process.env.CONTACT_OUTBOX_ENABLED = 'false'
  process.env.CONTACT_RETENTION_ENABLED = 'false'; process.env.CONTACT_RECONCILIATION_ENABLED = 'false'
  const { getPrisma } = await import('../src/lib/prisma'); db = getPrisma()
  const { reconcileContact } = await import('../src/lib/contact/contact-reconciliation')
  const { cleanContactRetention } = await import('../src/lib/contact/contact-retention')
  const { readContactHealth } = await import('../src/lib/contact/contact-health')
  const actor = randomUUID(), session = randomUUID(), organization = randomUUID(), membership = randomUUID()
  const identity = { userId: actor, sessionId: session }
  await sql.query(`INSERT INTO "User" VALUES ($1,'operator@example.invalid','ACTIVE','ADMIN',true)`, [actor])
  await sql.query(`INSERT INTO "Session" VALUES ($1,$2,now()+interval '1 day',NULL,NULL)`, [session, actor])
  await sql.query(`INSERT INTO "Organization" VALUES ($1,'ACTIVE','PLATFORM_OPERATOR','WORKMATCHR_PLATFORM')`, [organization])
  await sql.query(`INSERT INTO "OrganizationMembership" VALUES ($1,$2,$3,'ACTIVE','OWNER')`, [membership, actor, organization])
  const insert = async (template = 'CONTACT_MESSAGE', recipient: string | null = null) => {
    const id = randomUUID()
    await sql!.query(`INSERT INTO "NotificationOutbox" ("id","eventId","idempotencyKey","channel","templateKey","payload","status",
      "attemptCount","firstAttemptAt","createdAt","deliveryFingerprint","lastErrorCode","recipientUserId")
      VALUES ($1::uuid,$1::text,$1::text,'EMAIL',$2,'{"redacted":true}','FAILED',1,now()-interval '1 hour',now()-interval '2 hours',$3,'DELIVERY_RECONCILIATION_REQUIRED',$4)`, [id, template, 'a'.repeat(64), recipient])
    return { confirmation: 'RECONCILE_WITHOUT_RESENDING', outboxId: id, decisionId: randomUUID(), evidenceId: randomUUID(),
      evidenceSha256: 'b'.repeat(64), evidenceObservedAt: new Date(Date.now() - 1000).toISOString(), outcome: 'ACCEPTED',
      reason: 'PROVIDER_ACCEPTANCE_PROVEN', providerMessageId: randomUUID(), expectedAttemptCount: 1, expectedFingerprint: 'a'.repeat(64) }
  }
  const snapshot = async () => JSON.stringify([(await sql!.query('SELECT * FROM "NotificationOutbox" ORDER BY "id"')).rows,
    (await sql!.query('SELECT * FROM "MarketplaceAuditEvent" ORDER BY "id"')).rows])
  const blocked = async (input: unknown, who = identity) => { const before = await snapshot(); await assert.rejects(reconcileContact(who, input)); assert.equal(await snapshot(), before) }
  const initial = await insert()
  process.env.CONTACT_RECONCILIATION_OPERATOR_IDS = actor
  await blocked(initial); process.env.CONTACT_RECONCILIATION_ENABLED = 'true'
  process.env.CONTACT_RECONCILIATION_OPERATOR_IDS = ''; await blocked(initial)
  process.env.CONTACT_RECONCILIATION_OPERATOR_IDS = actor
  await blocked(initial, { userId: actor, sessionId: randomUUID() })
  check('gate closed, undesignated operator and nonexistent session cause zero side effects')
  for (const mutation of [
    `UPDATE "User" SET "status"='BLOCKED'`, `UPDATE "User" SET "platformRole"='USER'`, `UPDATE "User" SET "emailVerified"=false`,
    `UPDATE "OrganizationMembership" SET "role"='MEMBER'`, `UPDATE "OrganizationMembership" SET "status"='INACTIVE'`,
    `UPDATE "Organization" SET "organizationType"='CLIENT'`, `UPDATE "Organization" SET "status"='INACTIVE'`,
    `UPDATE "Session" SET "expiresAt"=now()-interval '1 second'`, `UPDATE "Session" SET "impersonatedUserId"="userId"`,
  ]) {
    await sql.query(mutation); await blocked(initial)
    await sql.query(`UPDATE "User" SET "status"='ACTIVE',"platformRole"='ADMIN',"emailVerified"=true;
      UPDATE "OrganizationMembership" SET "role"='OWNER',"status"='ACTIVE';
      UPDATE "Organization" SET "organizationType"='PLATFORM_OPERATOR',"status"='ACTIVE';
      UPDATE "Session" SET "expiresAt"=now()+interval '1 day',"impersonatedUserId"=NULL;`)
  }
  check('current user, OWNER/ADMIN membership, organization, expiry and no impersonation enforced inside transaction')
  for (const change of [{ outcome: 'UNKNOWN' }, { confirmation: '' }, { evidenceSha256: '' }, { actorUserId: actor },
    { expectedAttemptCount: 2 }, { expectedFingerprint: 'c'.repeat(64) }, { evidenceObservedAt: new Date(Date.now() + 60000).toISOString() },
    { providerMessageId: null }, { reason: 'PROVIDER_REJECTION_PROVEN' }]) await blocked({ ...initial, ...change })
  await blocked(await insert('OTHER_TEMPLATE')); await blocked(await insert('CONTACT_MESSAGE', randomUUID()))
  await sql.query(`UPDATE "NotificationOutbox" SET "leaseUntil"=now()+interval '1 hour' WHERE "id"=$1`, [initial.outboxId]); await blocked(initial)
  await sql.query(`UPDATE "NotificationOutbox" SET "leaseUntil"=NULL, "status"='PROCESSING' WHERE "id"=$1`, [initial.outboxId]); await blocked(initial)
  await sql.query(`UPDATE "NotificationOutbox" SET "status"='FAILED' WHERE "id"=$1`, [initial.outboxId])
  check('unknown evidence, stale version, active lease, processing and other template/recipient refused')
  const results = await Promise.all(Array.from({ length: 6 }, () => reconcileContact(identity, initial)))
  assert.equal(results.filter(r => !r.repeated).length, 1)
  assert.equal((await sql.query('SELECT * FROM "MarketplaceAuditEvent" WHERE "entityId"=$1', [initial.outboxId])).rowCount, 1)
  const accepted = (await sql.query('SELECT * FROM "NotificationOutbox" WHERE "id"=$1', [initial.outboxId])).rows[0]
  assert.equal(accepted.status, 'SENT'); assert.equal(accepted.attemptCount, 1); assert.equal(accepted.providerMessageId, initial.providerMessageId)
  await blocked({ ...initial, evidenceSha256: 'c'.repeat(64) })
  await sql.query(`UPDATE "Session" SET "expiresAt"=now()-interval '1 second'`); await blocked(initial)
  await sql.query(`UPDATE "Session" SET "expiresAt"=now()+interval '1 day'`)
  check('six concurrent identical decisions: one status change and audit, five safe replays; changed decision/revoked replay refused')
  const rejected = { ...await insert(), outcome: 'NOT_ACCEPTED', reason: 'PROVIDER_REJECTION_PROVEN', providerMessageId: null }
  await reconcileContact(identity, rejected)
  const failed = (await sql.query('SELECT * FROM "NotificationOutbox" WHERE "id"=$1', [rejected.outboxId])).rows[0]
  assert.equal(failed.status, 'FAILED'); assert.equal(failed.attemptCount, 1); assert.equal(failed.deliveryFingerprint, 'a'.repeat(64))
  const notFinal = await insert()
  await sql.query(`UPDATE "NotificationOutbox" SET "lastErrorCode"='CONTACT_RECONCILED_NOT_ACCEPTED',"processedAt"=now() WHERE "id"=$1`, [notFinal.outboxId])
  const future = new Date(failed.processedAt.getTime() + 30 * 86400000)
  assert.equal((await readContactHealth(future)).metadataOverdue, 2)
  process.env.CONTACT_RETENTION_ENABLED = 'true'
  await cleanContactRetention(new Date(future.getTime() - 1))
  assert.equal((await sql.query('SELECT 1 FROM "NotificationOutbox" WHERE "id"=$1', [rejected.outboxId])).rowCount, 1)
  await cleanContactRetention(future)
  assert.equal((await sql.query('SELECT 1 FROM "NotificationOutbox" WHERE "id"=$1', [rejected.outboxId])).rowCount, 0)
  assert.equal((await sql.query('SELECT 1 FROM "NotificationOutbox" WHERE "id"=$1', [notFinal.outboxId])).rowCount, 1)
  assert.equal((await reconcileContact(identity, rejected)).repeated, true)
  process.env.CONTACT_RETENTION_ENABLED = 'false'
  check('audited rejection preserves attempts, exact 30-day retention; marker alone does not finalize; replay after purge creates nothing')
  const fault = await insert()
  await sql.query(`CREATE FUNCTION "test_fail_audit"() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'synthetic'; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER "test_fail_audit" BEFORE INSERT ON "MarketplaceAuditEvent" FOR EACH ROW EXECUTE FUNCTION "test_fail_audit"()`)
  await blocked(fault)
  await sql.query('DROP TRIGGER "test_fail_audit" ON "MarketplaceAuditEvent"')
  await sql.query(`CREATE TRIGGER "test_fail_status" BEFORE UPDATE ON "NotificationOutbox" FOR EACH ROW EXECUTE FUNCTION "test_fail_audit"()`)
  await blocked(fault)
  await sql.query('DROP TRIGGER "test_fail_status" ON "NotificationOutbox"')
  await reconcileContact(identity, fault)
  check('audit insert and outbox update fault injection both roll back entire transaction; safe retry')
  await assert.rejects(sql.query(`UPDATE "MarketplaceAuditEvent" SET "reason"='changed'`))
  await assert.rejects(sql.query('DELETE FROM "MarketplaceAuditEvent"'))
  check('existing append-only audit trigger rejects update/delete')
  const { deliverContactEmails } = await import('../src/lib/contact/contact-email-worker')
  process.env.CONTACT_OUTBOX_ENABLED = 'true'
  process.env.CONTACT_MESSAGE_ENCRYPTION_KEY = 'd'.repeat(64)
  process.env.CONTACT_EMAIL_TO = 'sink@example.invalid'
  let calls = 0
  const dispatch = await deliverContactEmails({ send: async () => { calls++; throw new Error('MUST_NOT_SEND') } })
  assert.equal(calls, 0); assert.equal(dispatch.claimed, 0)
  check('existing dispatcher claims no reconciled or uncertain record; zero provider calls')
  console.log(`CONTACT_RECONCILIATION_DATABASE_PASS groups=${cases} migrations=0 externalCalls=0`)
} finally {
  await db?.$disconnect(); await sql?.end()
  if (created) {
    assert.match(name, /^workmatchr_contact_reconcile_[a-f0-9]{32}$/)
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name])
    await admin.query(`DROP DATABASE "${name}"`)
    console.log('CONTACT_RECONCILIATION_TEST_DATABASE_REMOVED')
  }
  await admin.end()
}
