import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Client } from 'pg'
import { contactRetentionFixture } from './fixtures/contact-retention-database'

// Native-auth, real PostgreSQL, own loopback database only; no dotenv or external transport.
function localSource() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '')
    assert.ok(['postgres:', 'postgresql:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.search && !url.hash)
    return url
  } catch { throw new Error('Only an isolated loopback PostgreSQL test source is allowed') }
}
const source = localSource()
globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED') }
const suffix = randomUUID().replaceAll('-', '')
const name = `workmatchr_register_${suffix}`
const roles = [`register_operator_${suffix}`, `register_other_${suffix}`]
const password = randomBytes(32).toString('hex')
const adminURL = new URL(source); adminURL.pathname = '/postgres'
const target = new URL(source); target.pathname = `/${name}`
const admin = new Client({ connectionString: adminURL.href })
const db = new Client({ connectionString: target.href })
const clients: Client[] = []
let created = false, connected = false, rolesCreated = false, groups = 0
const check = (label: string) => { groups++; console.log(`PASS ${label}`) }
const migration = readFileSync(new URL('../prisma/migrations/20261103100000_add_closed_contact_decision_register/migration.sql', import.meta.url), 'utf8')
await admin.connect()
const initial = (await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true
  await db.connect(); connected = true
  await db.query(contactRetentionFixture)
  await admin.query(`BEGIN; ${roles.map(role => `CREATE ROLE "${role}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'`).join(';')}; COMMIT`)
  rolesCreated = true
  await db.query(`ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO "${roles[1]}"`)
  await assert.rejects(db.query(migration), /UNSAFE_DEFAULT_PRIVILEGES/); await db.query('ROLLBACK')
  assert.equal((await db.query(`SELECT to_regnamespace('contact_decision_register') v`)).rows[0].v, null)
  await db.query(`ALTER DEFAULT PRIVILEGES REVOKE SELECT ON TABLES FROM "${roles[1]}"`)
  await db.query(migration)
  for (const role of roles) {
    const url = new URL(target); url.username = role; url.password = password
    const client = new Client({ connectionString: url.href }); await client.connect(); clients.push(client)
  }
  const [op, other] = clients
  const parallelURL = new URL(target); parallelURL.username = roles[0]; parallelURL.password = password
  const parallel = new Client({ connectionString: parallelURL.href }); await parallel.connect(); clients.push(parallel)
  const read = (id: string, client = op) => client.query('SELECT contact_decision_register.read_case($1) v', [id])
  const append = (id: string, event: string, expected: number, outbox: string, request: object, client = op) =>
    client.query('SELECT contact_decision_register.append($1,$2,$3,$4,$5) revision', [id, event, expected, outbox, request])
  const purge = (id: string, client = op) => client.query('SELECT contact_decision_register.purge($1) n', [id])
  await assert.rejects(read(randomUUID()))
  assert.equal((await db.query('SELECT count(*) n FROM contact_decision_register.approval')).rows[0].n, '0')
  for (const role of roles) await db.query(`GRANT USAGE ON SCHEMA contact_decision_register TO "${role}";
    GRANT EXECUTE ON FUNCTION contact_decision_register.append(uuid,uuid,integer,uuid,jsonb),
      contact_decision_register.read_case(uuid),contact_decision_register.purge(uuid) TO "${role}"`)
  await assert.rejects(read(randomUUID(), db), /FORBIDDEN/)
  await assert.rejects(purge(randomUUID()), /PURGE_CLOSED/)
  await assert.rejects(op.query('SELECT * FROM contact_decision_register.entry'), /permission denied/)
  await assert.rejects(op.query('INSERT INTO contact_decision_register.approval DEFAULT VALUES'), /permission denied/)
  check('unsafe defaults rollback; no public/runtime access or self-approval; owner cannot impersonate native operator')
  const insert = async (template = 'CONTACT_MESSAGE', status = 'FAILED', attempts = 1) => {
    const id = randomUUID()
    await db.query(`INSERT INTO "NotificationOutbox" ("id","eventId","idempotencyKey","channel","templateKey","payload","status","attemptCount","createdAt","firstAttemptAt")
      VALUES($1::uuid,$1::text,$1::text,'EMAIL',$2,'{"redacted":true}',$3,$4,now()-interval '2 days',now()-interval '1 day')`, [id, template, status, attempts])
    return id
  }
  const open = { action: 'OPEN', reason: 'DELIVERY_UNCERTAIN' }
  for (const id of [randomUUID(), await insert('OTHER'), await insert('CONTACT_MESSAGE', 'SENT'), await insert('CONTACT_MESSAGE', 'FAILED', 0)])
    await assert.rejects(append(randomUUID(), randomUUID(), 0, id, open))
  const outbox = await insert(), caseId = randomUUID(), eventId = randomUUID()
  assert.equal((await append(caseId, eventId, 0, outbox, open)).rows[0].revision, 1)
  assert.equal((await append(caseId, eventId, 0, outbox, open)).rows[0].revision, 1)
  await assert.rejects(append(randomUUID(), randomUUID(), 0, outbox, open), /unique/)
  await assert.rejects(read(caseId, other), /FORBIDDEN/)
  await assert.rejects(append(caseId, randomUUID(), 1, outbox, { action: 'TRIAGE', reason: 'PROVIDER_REVIEW' }, other), /CONFLICT/)
  for (const request of [{ ...open, body: 'not permitted' }, { action: 'OPEN', reason: 'unknown' }, { action: 'TRIAGE', reason: 'PROVIDER_REVIEW', evidenceId: randomUUID() }])
    await assert.rejects(append(caseId, randomUUID(), 1, outbox, request))
  const first = (await read(caseId)).rows[0].v
  assert.equal(first.retentionApproved, false)
  assert.equal(new Date(first.escalationDueAt).getTime() - new Date(first.triageDueAt).getTime(), 48 * 3600000)
  check('only uncertain contact records; case uniqueness, cross-operator denial, no free content; deadlines use fixed source clock')
  const triage = { action: 'TRIAGE', reason: 'PROVIDER_REVIEW' }
  await append(caseId, randomUUID(), 1, outbox, triage)
  await assert.rejects(append(caseId, randomUUID(), 1, outbox, triage), /CONFLICT/)
  const escalation = { action: 'ESCALATE', reason: 'DEADLINE_EXCEEDED' }
  const racing = await Promise.allSettled([append(caseId, randomUUID(), 2, outbox, escalation),
    append(caseId, randomUUID(), 2, outbox, escalation, parallel)])
  assert.equal(racing.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal((await read(caseId)).rows[0].v.revision, 3)
  await append(caseId, randomUUID(), 3, outbox, { action: 'UNKNOWN', reason: 'MISSING_EVIDENCE' })
  const ongoing = (await read(caseId)).rows[0].v
  assert.equal(ongoing.triageDueAt, first.triageDueAt); assert.equal(ongoing.finalizedAt, null)
  await assert.rejects(append(caseId, randomUUID(), 4, outbox, { action: 'FINALIZE', reason: 'MATCHED_RECONCILIATION' }), /NOT_FINAL/)
  assert.equal((await db.query('SELECT "status" FROM "NotificationOutbox" WHERE id=$1', [outbox])).rows[0].status, 'FAILED')
  check('optimistic revisions, concurrent commands and unknown outcomes preserve outbox and never extend deadlines')
  const proposal = { action: 'PROPOSE_ACCEPTED', reason: 'PROVIDER_ACCEPTANCE_PROVEN', evidenceId: randomUUID(),
    evidenceSha256: 'b'.repeat(64), evidenceObservedAt: new Date(Date.now() - 1000).toISOString(), decisionId: randomUUID() }
  await assert.rejects(append(caseId, randomUUID(), 4, outbox, { ...proposal, evidenceObservedAt: new Date(Date.now() + 60000).toISOString() }))
  await append(caseId, randomUUID(), 4, outbox, proposal)
  const finalize = { action: 'FINALIZE', reason: 'MATCHED_RECONCILIATION' }
  await assert.rejects(append(caseId, randomUUID(), 5, outbox, finalize), /NOT_FINAL/)
  const auditId = randomUUID()
  const metadata = { policyVersion: 'CONTACT_RECONCILIATION_V1', decisionHash: 'a'.repeat(64), outcome: 'ACCEPTED',
    decisionId: proposal.decisionId, evidenceId: proposal.evidenceId, evidenceSha256: proposal.evidenceSha256, evidenceObservedAt: proposal.evidenceObservedAt }
  await db.query(`INSERT INTO "MarketplaceAuditEvent" (id,"actorUserId","actorRole",action,"entityType","entityId","previousState","nextState",reason,"correlationKey",metadata)
    VALUES($1,$2,'CONTACT_RECONCILIATION_OPERATOR','CONTACT_RECONCILED','NotificationOutbox',$3,'FAILED','SENT','PROVIDER_ACCEPTANCE_PROVEN',$4,$5)`,
  [auditId, randomUUID(), outbox, `contact-reconcile:${outbox}`, metadata])
  await assert.rejects(append(caseId, randomUUID(), 5, outbox, finalize), /NOT_FINAL/)
  await db.query(`UPDATE "NotificationOutbox" SET status='SENT',"processedAt"=(SELECT "createdAt" FROM "MarketplaceAuditEvent" WHERE id=$2) WHERE id=$1`, [outbox, auditId])
  await append(caseId, randomUUID(), 5, outbox, finalize)
  const closed = (await read(caseId)).rows[0].v
  assert.ok(closed.finalizedAt); assert.equal(closed.retentionApproved, false)
  await assert.rejects(append(caseId, randomUUID(), 6, outbox, triage), /CONFLICT/)
  await assert.rejects(db.query('UPDATE contact_decision_register.entry SET recorded_at=now()'), /IMMUTABLE/)
  await assert.rejects(db.query('DELETE FROM contact_decision_register.entry'), /IMMUTABLE/)
  check('human proposal is not finality; exact native reconciliation evidence and final outbox required; history immutable')
  const oid = (await db.query('SELECT oid FROM pg_roles WHERE rolname=$1', [roles[0]])).rows[0].oid
  const authorize = async (targets: object[], lifetime = '10 minutes') => {
    const id = randomUUID()
    await db.query(`INSERT INTO contact_decision_register.approval(run_id,operator_oid,policy_reference,expires_at,targets,no_legal_hold,copies_reviewed)
      VALUES($1,$2,$3,clock_timestamp()+$4::interval,$5,true,true)`, [id, oid, randomUUID(), lifetime, JSON.stringify(targets)])
    return id
  }
  await assert.rejects(authorize([{ caseId, revision: 6 }], '16 minutes'))
  await assert.rejects(authorize([])); await assert.rejects(authorize(Array.from({ length: 101 }, () => ({ caseId, revision: 6 }))))
  await assert.rejects(purge(await authorize([{ caseId, revision: 6 }])), /INELIGIBLE/)
  // Synthetic aged entries model the precise retention boundary without disabling any trigger.
  const aged = async (age: string, finalized = true, linkedOutbox = randomUUID()) => {
    const id = randomUUID()
    await db.query(`INSERT INTO contact_decision_register.entry VALUES($1,1,$2,$3,$4,now()-interval '60 days',now()-interval '40 days',
      '{"action":"FINALIZE","reason":"MATCHED_RECONCILIATION"}',CASE WHEN $5 THEN clock_timestamp()-$6::interval ELSE NULL END)`,
    [id, randomUUID(), oid, linkedOutbox, finalized, age])
    return id
  }
  const young = await aged('719 hours'), uncertain = await aged('721 hours', false), active = await aged('721 hours', true, await insert())
  for (const id of [young, uncertain, active]) await assert.rejects(purge(await authorize([{ caseId: id, revision: 1 }])), /INELIGIBLE/)
  const old = await aged('721 hours'), run = await authorize([{ caseId: old, revision: 1 }])
  const boundary = await aged('720 hours')
  assert.equal((await purge(await authorize([{ caseId: boundary, revision: 1 }]))).rows[0].n, 1)
  const expired = await authorize([{ caseId: old, revision: 1 }])
  await db.query("UPDATE contact_decision_register.approval SET approved_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE run_id=$1", [expired])
  await assert.rejects(purge(expired), /CLOSED/)
  await assert.rejects(purge(await authorize([{ caseId: old, revision: 1 }, { caseId: young, revision: 1 }])), /INELIGIBLE/)
  assert.equal((await read(old)).rows[0].v.revision, 1)
  await assert.rejects(purge(run, other), /CLOSED/)
  await db.query(`ALTER TABLE contact_decision_register.receipt ADD CONSTRAINT injected_failure CHECK(false) NOT VALID`)
  await assert.rejects(purge(run), /injected_failure/)
  assert.equal((await db.query('SELECT count(*) n FROM contact_decision_register.entry WHERE case_id=$1', [old])).rows[0].n, '1')
  assert.equal((await db.query('SELECT count(*) n FROM contact_decision_register.permit')).rows[0].n, '0')
  await db.query('ALTER TABLE contact_decision_register.receipt DROP CONSTRAINT injected_failure')
  assert.equal((await purge(run)).rows[0].n, 1); assert.equal((await purge(run)).rows[0].n, 1)
  await assert.rejects(read(old), /FORBIDDEN/)
  assert.equal((await db.query('SELECT count(*) n FROM "MarketplaceAuditEvent"')).rows[0].n, '1')
  assert.equal((await db.query('SELECT count(*) n FROM "NotificationOutbox" WHERE id=$1', [outbox])).rows[0].n, '1')
  check('explicit bounded manifests; age/active/unknown safeguards; failed receipt rolls back all; retry once; marketplace audit untouched')
  for (const grant of ['TRIGGER ON contact_decision_register.entry', 'INSERT ON contact_decision_register.permit',
    'UPDATE(request) ON contact_decision_register.entry', 'CREATE ON SCHEMA public']) {
    await db.query(`GRANT ${grant} TO "${roles[0]}"`)
    await assert.rejects(read(caseId), /FORBIDDEN/)
    await db.query(`REVOKE ${grant} FROM "${roles[0]}"`)
  }
  await db.query(`CREATE FUNCTION public.register_test_trigger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN OLD; END $$;
    CREATE TRIGGER planted BEFORE DELETE ON contact_decision_register.entry FOR EACH ROW EXECUTE FUNCTION public.register_test_trigger()`)
  await assert.rejects(read(caseId), /INTEGRITY/)
  await db.query('DROP TRIGGER planted ON contact_decision_register.entry; DROP FUNCTION public.register_test_trigger()')
  await db.query('CREATE TABLE public.register_test_cascade(case_id uuid,revision integer,FOREIGN KEY(case_id,revision) REFERENCES contact_decision_register.entry ON DELETE CASCADE)')
  await assert.rejects(read(caseId), /INTEGRITY/)
  await db.query('DROP TABLE public.register_test_cascade')
  await op.query('BEGIN'); await read(caseId)
  await db.query(`SET lock_timeout='100ms'`)
  await assert.rejects(db.query('ALTER TABLE contact_decision_register.entry ADD COLUMN attack text'), /lock timeout/)
  await db.query('RESET lock_timeout'); await op.query('ROLLBACK')
  await db.query(`REVOKE EXECUTE ON FUNCTION contact_decision_register.read_case(uuid) FROM "${roles[0]}"`)
  await assert.rejects(read(caseId), /permission denied/)
  check('trigger/DML/column/schema privilege escalation, planted code, DDL races and revoked access fail closed')
  console.log(`CONTACT_DECISION_REGISTER_PASS groups=${groups} externalCalls=0`)
} finally {
  for (const client of clients) await client.end()
  if (connected) await db.end()
  if (created) {
    assert.match(name, /^workmatchr_register_[a-f0-9]{32}$/)
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name])
    await admin.query(`DROP DATABASE "${name}"`)
  }
  if (rolesCreated) for (const role of roles) await admin.query(`DROP ROLE "${role}"`)
  assert.deepEqual((await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows, initial)
  await admin.end(); console.log('CLEANUP PASS own database/roles removed; existing databases unchanged')
}
