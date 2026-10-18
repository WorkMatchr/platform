import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'

// Only the authenticated session boundary is replaced. The real API access,
// route, evaluator, service, membership checks and PostgreSQL transactions run.
const fixture = globalThis as unknown as { complianceTestContext: unknown }
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  if (specifier === '@/lib/organizations/organization-authorization') return {
    url: 'data:text/javascript,export async function getOptionalActiveOrganizationContext(){return globalThis.complianceTestContext}', shortCircuit: true,
  }
  return nextResolve(specifier, context)
} })

// Never load a local/production env file; require explicit local test credentials.
const sourceUrl = new URL(process.env.DATABASE_URL ?? 'invalid:')
if (!['postgres:', 'postgresql:'].includes(sourceUrl.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(sourceUrl.hostname)) throw new Error('Een expliciete lokale PostgreSQL-testverbinding is vereist.')
const databaseName = `workmatchr_compliance_f1_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres'; adminUrl.search = ''
const testUrl = new URL(sourceUrl); testUrl.pathname = `/${databaseName}`; testUrl.search = ''
const npmPath = process.env.npm_execpath
if (!npmPath) throw new Error('Voer uit via npm run test:db:compliance-runs.')

function deploy() {
  const result = spawnSync(process.execPath, [npmPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: 'utf8', stdio: 'pipe',
  })
  // Do not echo connection strings, credentials or child output.
  assert.equal(result.status, 0, 'Volledige migratieketen moet slagen op de nieuw aangemaakte testdatabase.')
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let created = false
  let db: ReturnType<typeof import('../src/lib/prisma').getPrisma> | undefined
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`); created = true
    deploy()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    db = getPrisma()
    const service = await import('../src/lib/arbo-guides/arbo-guide-run-service')
    const { COMPLIANCE_FRAMEWORK_BINDING: binding } = await import('../src/lib/compliance-guide/compliance-framework-binding')
    const { POST } = await import('../src/app/wijzers/compliance/runs/route')
    const migrations = readdirSync('prisma/migrations', { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    const registry = () => db!.$queryRawUnsafe<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')
    const before = await registry()
    assert.deepEqual(before.map((row) => row.migration_name), migrations)
    for (const row of before) {
      assert.ok(row.finished_at); assert.equal(row.rolled_back_at, null)
      const sql = readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`)
      assert.equal(row.checksum, createHash('sha256').update(sql).digest('hex'))
    }
    deploy()
    assert.deepEqual(await registry(), before, 'Herhaald deploy wijzigt geen registraties/checksums.')
    console.log(`Migratieketen: ${before.length}/${migrations.length}, 0 failed, 0 onverwacht; herhaling ongewijzigd.`)

    // Exercise the existing operator CLI only against this process-owned database.
    const frameworkCount = await db.complianceFrameworkVersion.count()
    const dryRun = spawnSync(process.execPath, [npmPath!, 'exec', '--', 'tsx', 'scripts/check-compliance-f4-publication.ts', '--check'], {
      cwd: process.cwd(), env: { ...process.env, COMPLIANCE_REVIEW_DATABASE_URL: testUrl.toString() }, encoding: 'utf8', stdio: 'pipe',
    })
    assert.equal(dryRun.status, 2, 'Niet geregistreerd F4-framework moet CLI NO_GO opleveren.')
    const dryRunReport = JSON.parse(dryRun.stdout) as { readOnly: boolean; decision: string; errors: string[]; expectedRules: { present: boolean }[] }
    assert.equal(dryRunReport.readOnly, true)
    assert.equal(dryRunReport.decision, 'NO_GO')
    assert.deepEqual(dryRunReport.errors, ['FRAMEWORK_NOT_REGISTERED'])
    assert.equal(dryRunReport.expectedRules.length, 141)
    assert.ok(dryRunReport.expectedRules.every(rule => !rule.present))
    assert.equal(await db.complianceFrameworkVersion.count(), frameworkCount)
    assert.deepEqual(await registry(), before)
    console.log('F4 read-only CLI PASS: exit 2 NO_GO, 141 ontbrekende regels, geen frameworkregistratie of migratiehistoriewijziging.')

    const user = await db.user.create({ data: { email: 'compliance-f1@example.invalid', status: 'ACTIVE', emailVerified: true, accountType: 'CLIENT' } })
    const otherUser = await db.user.create({ data: { email: 'other-compliance-f1@example.invalid', status: 'ACTIVE', emailVerified: true, accountType: 'CLIENT' } })
    const organization = await db.organization.create({ data: { name: 'Synthetische F1 organisatie', organizationType: 'CLIENT', status: 'ACTIVE' } })
    const other = await db.organization.create({ data: { name: 'Synthetische andere organisatie', organizationType: 'CLIENT', status: 'ACTIVE' } })
    await db.organizationMembership.createMany({ data: [
      { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' },
      { userId: otherUser.id, organizationId: other.id, role: 'MEMBER', status: 'ACTIVE' },
    ] })
    const context = { user: { id: user.id }, activeMembership: { organization: { id: organization.id, name: organization.name } } }
    fixture.complianceTestContext = context
    const payload = { idempotencyKey: 'route-postgresql-f1', startedAt: new Date(Date.now() - 60_000).toISOString(), completedAt: new Date().toISOString(), answers: { hasEmployees: 'YES', employeeCount: 'ONE_TO_25', generalPolicy: 'YES' } }
    const post = (body: unknown = payload) => POST(new Request('http://localhost/wijzers/compliance/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    const first = await post({ ...payload, organizationId: other.id, complianceFrameworkVersionId: other.id, reportSnapshot: { results: [] } })
    assert.equal(first.status, 201)
    const saved = await first.json() as { runId: string }
    const stored = await db.arboGuideRun.findUniqueOrThrow({ where: { id: saved.runId }, include: { results: true } })
    assert.equal(stored.organizationId, organization.id)
    assert.equal(stored.complianceFrameworkVersionId, binding.id)
    assert.equal(stored.status, 'COMPLETED'); assert.equal(stored.results.length, 9)
    assert.equal((stored.reportSnapshot as { assessmentVersion: number }).assessmentVersion, 1)
    assert.equal((await post()).status, 200)
    assert.equal((await post({ ...payload, answers: { ...payload.answers, generalPolicy: 'NO' } })).status, 409)

    const concurrent = await Promise.all(Array.from({ length: 6 }, () => post({ ...payload, idempotencyKey: 'concurrent-route-f1' })))
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 200, 200, 200, 200, 201])
    assert.equal(await db.arboGuideRun.count(), 2)
    assert.equal(await db.arboGuideRunResult.count(), 18)
    assert.equal(await db.arboGuideRun.count({ where: { status: 'IN_PROGRESS' } }), 0)

    fixture.complianceTestContext = null
    assert.equal((await post()).status, 401)
    fixture.complianceTestContext = { user: { id: user.id }, activeMembership: null }
    assert.equal((await post()).status, 403)
    fixture.complianceTestContext = { ...context, user: { id: otherUser.id } }
    assert.equal((await post({ ...payload, idempotencyKey: 'cross-tenant-f1' })).status, 403)
    fixture.complianceTestContext = context
    for (const role of ['ADMIN', 'MEMBER'] as const) {
      await db.organizationMembership.update({ where: { userId: user.id }, data: { role } })
      assert.equal((await post()).status, 200)
    }
    await db.organizationMembership.update({ where: { userId: user.id }, data: { status: 'SUSPENDED' } })
    assert.equal((await post()).status, 403)
    await db.organizationMembership.update({ where: { userId: user.id }, data: { status: 'ACTIVE' } })
    await db.user.update({ where: { id: user.id }, data: { status: 'BLOCKED' } })
    assert.equal((await post()).status, 403)
    await db.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } })
    assert.equal(await db.arboGuideRun.count(), 2)

    // No arbitrary DRAFT/newest framework can be substituted through the domain service.
    const draft = await db.complianceFrameworkVersion.create({ data: { frameworkCode: 'NL_ARBO', version: '2026-10', status: 'DRAFT', title: 'Toekomstig testframework', methodology: 'Test', disclaimer: 'Test', checksum: 'a'.repeat(64) } })
    const serviceInput = { guideType: 'COMPLIANCE', guideVersion: '1', reportVersion: '1.0', organizationId: organization.id, completedByUserId: user.id, startedAt: stored.startedAt, completedAt: stored.completedAt, answersSnapshot: stored.answersSnapshot, reportSnapshot: stored.reportSnapshot }
    for (const frameworkId of [undefined, draft.id, '00000000-0000-4000-8000-000000000099']) {
      await assert.rejects(service.completeArboGuideRun({ ...serviceInput, idempotencyKey: 'invalid-framework-f1', complianceFrameworkVersionId: frameworkId }), (error: unknown) => error instanceof service.ArboGuideRunError && error.code === 'INVALID_INPUT')
    }
    await assert.rejects(service.completeArboGuideRun({ ...serviceInput, idempotencyKey: 'wrong-version-f1', complianceFrameworkVersionId: binding.id, guideVersion: '2' }))
    assert.equal(await db.arboGuideRun.count(), 2)
    await assert.rejects(db.arboGuideRun.update({ where: { id: saved.runId }, data: { complianceFrameworkVersionId: draft.id } }))
    await assert.rejects(db.arboGuideRunResult.updateMany({ where: { arboGuideRunId: saved.runId }, data: { title: 'Wijzigen mag niet' } }))
    await assert.rejects(service.getArboGuideRun({ userId: otherUser.id, organizationId: other.id }, saved.runId))

    // Synthetic pre-foundation record: nullable framework remains readable; no backfill.
    const historical = await db.$transaction(async (tx) => {
      const run = await tx.arboGuideRun.create({ data: {
        guideType: 'COMPLIANCE', guideVersion: '1', reportVersion: '1.0',
        organizationId: organization.id, completedByUserId: user.id,
        idempotencyKey: 'historical-without-framework', answersSnapshot: {},
      } })
      const result = stored.results[0]
      await tx.arboGuideRunResult.create({ data: {
        arboGuideRunId: run.id, position: 1, subjectCode: result.subjectCode,
        title: result.title, status: result.status, explanation: result.explanation,
        recommendedAction: result.recommendedAction, sourceIdsSnapshot: [],
      } })
      return tx.arboGuideRun.update({ where: { id: run.id }, data: {
        status: 'COMPLETED', reportNumber: 'CW-2026-999999', completedAt: new Date(),
        reportSnapshot: JSON.parse(JSON.stringify(stored.reportSnapshot)), snapshotFingerprint: 'b'.repeat(64),
      } })
    })
    assert.equal((await service.getArboGuideRun({ userId: user.id, organizationId: organization.id }, historical.id)).complianceFrameworkVersionId, null)

    // Retirement does not rewrite or prevent reading/replaying historical completed results.
    await db.complianceFrameworkVersion.update({ where: { id: binding.id }, data: { status: 'RETIRED', retiredAt: new Date() } })
    assert.equal((await post()).status, 200)
    assert.equal((await post({ ...payload, idempotencyKey: 'retired-framework-f1' })).status, 400)
    assert.deepEqual(await db.arboGuideRun.findUniqueOrThrow({ where: { id: saved.runId }, include: { results: true } }), stored)
    assert.equal((await service.listArboGuideRuns({ userId: user.id, organizationId: organization.id })).length, 3)
    assert.deepEqual(await db.arboGuideRun.findUniqueOrThrow({ where: { id: historical.id } }), historical)
    const { verifyComplianceV2Database } = await import('./fixtures/compliance-v2-database')
    await verifyComplianceV2Database(db, { userId: user.id, organizationId: organization.id }, { userId: otherUser.id, organizationId: other.id })
    console.log('Route → evaluator → service → PostgreSQL PASS; 6 gelijktijdige aanvragen: exact 1 nieuwe run/9 resultaten; autorisatie, tenantisolatie, frameworkversie en historische snapshots PASS.')
    fixture.complianceTestContext = context
    const { verifyComplianceF4Database } = await import('./fixtures/compliance-f4-database')
    await verifyComplianceF4Database(db, { userId: user.id, organizationId: organization.id }, { userId: otherUser.id, organizationId: other.id })
  } finally {
    fixture.complianceTestContext = null
    await db?.$disconnect()
    // Only this process-owned, freshly created database is removed; never a supplied database.
    if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof assert.AssertionError ? error.message : 'Compliance F1/F2-databasetest mislukt; geen credentials gelogd.')
  if (error instanceof Error) console.error(error.name, (error.stack ?? '').split('\n').filter(line => line.trim().startsWith('at ')).slice(0, 5).join('\n'))
  if (error instanceof Error && error.cause && typeof error.cause === 'object') {
    const cause = error.cause as Record<string, unknown>
    console.error('Local database diagnostic:', JSON.stringify({ kind: cause.kind, code: cause.originalCode, message: typeof cause.originalMessage === 'string' ? cause.originalMessage.replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED]') : undefined }))
  }
  process.exitCode = 1
})
