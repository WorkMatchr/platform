import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
    return nextResolve(specifier, context)
  },
})

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) throw new Error('Deze test mag uitsluitend tegen lokale PostgreSQL draaien.')

const databaseName = `workmatchr_arbo_guides_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres'; adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl); testUrl.pathname = `/${databaseName}`; testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deployMigrations() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: 'utf8', stdio: 'pipe',
  })
  if (result.status !== 0) throw new Error(`Migraties mislukt:\n${result.stdout}\n${result.stderr}`)
}

const report = {
  schemaVersion: 1 as const, tier: 'BASIC' as const, organizationName: 'Arbo Test BV', scannedAt: '2026-08-20T10:00:00.000Z',
  assessmentVersion: 1, reportVersion: '1.0', summary: { order: 1, action: 0, check: 0, notApplicable: 0 },
  results: [{ id: 'policy', title: 'Arbobeleid', status: 'ORDER' as const, statusLabel: 'Op orde', explanation: 'Beleid is geregeld.', relevance: 'Beleid beheerst risico’s.', nextStep: 'Blijf periodiek controleren.', sources: [], extended: { answerKeys: ['generalPolicy'], legalBasisAvailable: true, priority: 'NORMAL' as const } }],
  attentionItems: [], sources: [], disclaimer: 'Indicatief overzicht.', extendedCapabilities: [],
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma').getPrisma>> | undefined
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deployMigrations()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    const service = await import('../src/lib/arbo-guides/arbo-guide-run-service')
    prisma = getPrisma()

    const user = await prisma.user.create({ data: { email: 'arbo-guide@example.invalid', status: 'ACTIVE', emailVerified: true, accountType: 'CLIENT' } })
    const otherUser = await prisma.user.create({ data: { email: 'other-arbo-guide@example.invalid', status: 'ACTIVE', emailVerified: true, accountType: 'CLIENT' } })
    const organization = await prisma.organization.create({ data: { name: 'Arbo Test BV', organizationType: 'CLIENT', status: 'ACTIVE' } })
    const otherOrganization = await prisma.organization.create({ data: { name: 'Andere BV', organizationType: 'CLIENT', status: 'ACTIVE' } })
    await prisma.organizationMembership.createMany({ data: [
      { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' },
      { userId: otherUser.id, organizationId: otherOrganization.id, role: 'OWNER', status: 'ACTIVE' },
    ] })

    const base = {
      guideType: 'COMPLIANCE' as const, guideVersion: '1', reportVersion: '1.0', organizationId: organization.id,
      completedByUserId: user.id, startedAt: new Date('2026-08-20T09:50:00Z'), completedAt: new Date('2026-08-20T10:00:00Z'),
      answersSnapshot: { generalPolicy: 'YES' }, reportSnapshot: report,
    }
    const first = await service.completeArboGuideRun({ ...base, idempotencyKey: 'database-run-1' })
    assert.equal(first.reportNumber, 'CW-2026-000001')
    assert.equal((await service.completeArboGuideRun({ ...base, idempotencyKey: 'database-run-1' })).created, false)
    await assert.rejects(service.completeArboGuideRun({ ...base, idempotencyKey: 'database-run-1', answersSnapshot: { generalPolicy: 'NO' } }), (error: unknown) => error instanceof service.ArboGuideRunError && error.code === 'CONFLICT')

    const [second, third] = await Promise.all([
      service.completeArboGuideRun({ ...base, idempotencyKey: 'database-run-2' }),
      service.completeArboGuideRun({ ...base, idempotencyKey: 'database-run-3' }),
    ])
    assert.deepEqual([second.reportNumber, third.reportNumber].sort(), ['CW-2026-000002', 'CW-2026-000003'])
    assert.equal(await prisma.arboGuideRun.count(), 3)
    assert.equal(await prisma.arboGuideRunResult.count(), 3)
    await assert.rejects(service.completeArboGuideRun({ ...base, idempotencyKey: 'wrong-tenant-run', completedByUserId: otherUser.id }), (error: unknown) => error instanceof service.ArboGuideRunError && error.code === 'ACCESS_DENIED')
    assert.equal(await prisma.arboGuideRun.count(), 3, 'Een autorisatiefout mag geen gedeeltelijke run achterlaten.')
    await assert.rejects(prisma.$transaction(async (tx) => {
      const incomplete = await tx.arboGuideRun.create({ data: {
        guideType: 'COMPLIANCE', guideVersion: '1', reportVersion: '1.0', organizationId: organization.id,
        completedByUserId: user.id, idempotencyKey: 'forced-late-failure', answersSnapshot: {},
      } })
      await tx.arboGuideRun.update({ where: { id: incomplete.id }, data: {
        status: 'COMPLETED', reportNumber: 'CW-2026-999999', completedAt: new Date('2026-08-20T10:00:00Z'),
        reportSnapshot: report, snapshotFingerprint: 'a'.repeat(64),
      } })
    }))
    assert.equal(await prisma.arboGuideRun.count(), 3, 'Deferred evidencefout moet de volledige transactie terugrollen.')
    assert.equal((await service.listArboGuideRuns({ userId: user.id, organizationId: organization.id })).length, 3)
    await assert.rejects(service.getArboGuideRun({ userId: otherUser.id, organizationId: otherOrganization.id }, first.id), (error: unknown) => error instanceof service.ArboGuideRunError && error.code === 'NOT_FOUND')
    await assert.rejects(prisma.arboGuideRun.delete({ where: { id: first.id } }))
    await assert.rejects(prisma.arboGuideRunResult.updateMany({ where: { arboGuideRunId: first.id }, data: { title: 'Gewijzigd' } }))
    assert.equal(await prisma.arboGuideRun.count({ where: { status: 'IN_PROGRESS' } }), 0)

    console.log('ArboGuideRun-databaseacceptatie geslaagd: idempotentie, volgnummer, concurrency, tenantisolatie en immutability.')
  } finally {
    await prisma?.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
