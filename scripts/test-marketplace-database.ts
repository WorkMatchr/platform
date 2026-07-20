import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) throw new Error('De marktplaatstest mag uitsluitend lokaal draaien.')
const databaseName = `workmatchr_marketplace_test_${process.pid}_${Date.now()}`
if (!/^workmatchr_marketplace_test_[0-9_]+$/.test(databaseName)) throw new Error('Ongeldige testdatabasenaam.')
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deploySchema() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: 'utf8', stdio: 'pipe',
  })
  if (result.status !== 0) throw new Error(`Migraties in marktplaatstestdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma')['getPrisma']>> | null = null
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deploySchema()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    prisma = getPrisma()

    const clientOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Markt Opdrachtgever', organizationType: 'CLIENT', status: 'ACTIVE' } })
    const providerOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Markt Dienstverlener', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const clientUser = await prisma.user.create({ data: { email: `client-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, memberships: { create: { organizationId: clientOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const providerUser = await prisma.user.create({ data: { email: `provider-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, memberships: { create: { organizationId: providerOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const provider = await prisma.providerProfile.create({ data: { organizationId: providerOrganization.id, lifecycleStatus: 'QUALIFIED', readinessStatus: 'READY', platformQualificationStatus: 'QUALIFIED', selectabilityStatus: 'SELECTABLE' } })
    const readiness = await prisma.providerReadinessAssessment.create({ data: { providerProfileId: provider.id, status: 'READY', reasonCodes: [], sourceVersion: 1, checksum: 'a'.repeat(64) } })
    const selectability = await prisma.providerSelectabilityAssessment.create({ data: { providerProfileId: provider.id, readinessAssessmentId: readiness.id, status: 'SELECTABLE', reasonCodes: [], sourceVersion: 1, checksum: 'b'.repeat(64) } })
    const projection = await prisma.trustedProviderProjection.create({ data: { providerProfileId: provider.id, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1, payload: { capabilities: [], sectors: [], workAreas: [] }, sha256: 'c'.repeat(64), validFrom: new Date(), validUntil: new Date(Date.now() + 86_400_000) } })
    const assignment = await prisma.assignment.create({ data: { clientOrganizationId: clientOrganization.id, createdByUserId: clientUser.id, title: 'TEST-WM opdracht', description: 'Fictieve integratietestopdracht.' } })
    const run = await prisma.marketplaceMatchRun.create({ data: { assignmentId: assignment.id, assignmentVersion: 1, engineVersion: '1', modelVersion: '1', ruleVersion: '1', taxonomyVersion: '1', startedByUserId: clientUser.id, idempotencyKey: randomUUID(), confidenceLevel: 'HOOG', confidenceReasons: [], assignmentSnapshot: {}, inputChecksum: 'd'.repeat(64) } })
    const candidate = await prisma.marketplaceMatchCandidate.create({ data: { matchRunId: run.id, providerProfileId: provider.id, projectionId: projection.id, status: 'SELECTED', rank: 1, scoreNumerator: 1, scoreDenominator: 1, normalizedScore: 10_000, exclusionReasons: [], explanation: {}, providerSnapshot: {}, snapshotChecksum: 'e'.repeat(64) } })
    const invitation = await prisma.providerInvitation.create({ data: { assignmentId: assignment.id, matchRunId: run.id, matchCandidateId: candidate.id, providerProfileId: provider.id, providerOrganizationId: providerOrganization.id, creditCost: 10, deadlineAt: new Date(Date.now() + 86_400_000), snapshot: {}, snapshotChecksum: 'f'.repeat(64), idempotencyKey: randomUUID() } })
    const participation = await prisma.providerParticipation.create({ data: { assignmentId: assignment.id, invitationId: invitation.id, providerProfileId: provider.id, providerOrganizationId: providerOrganization.id, createdByUserId: providerUser.id, idempotencyKey: randomUUID() } })
    const account = await prisma.creditAccount.create({ data: { organizationId: providerOrganization.id, balance: 10, availableBalance: 10 } })
    const reservation = await prisma.creditReservation.create({ data: { creditAccountId: account.id, participationId: participation.id, amount: 10, idempotencyKey: randomUUID() } })
    const ledger = await prisma.creditTransaction.create({ data: { creditAccountId: account.id, type: 'RESERVATION', amount: -10, balanceAfter: 0, reservationId: reservation.id, idempotencyKey: randomUUID() } })
    const quote = await prisma.quote.create({ data: { assignmentId: assignment.id, participationId: participation.id, providerProfileId: provider.id, providerOrganizationId: providerOrganization.id } })
    const quoteVersion = await prisma.quoteVersion.create({ data: { quoteId: quote.id, version: 1, priceCents: BigInt(10_000), priceExplanation: 'Fictieve prijsuitleg', approach: 'Fictieve maar voldoende lange aanpak.', planning: 'Binnen vier weken.', submittedByUserId: providerUser.id } })
    await prisma.quote.update({ where: { id: quote.id }, data: { currentVersionId: quoteVersion.id, submittedVersionId: quoteVersion.id, status: 'SUBMITTED' } })
    await prisma.awardDecision.create({ data: { assignmentId: assignment.id, quoteId: quote.id, quoteVersionId: quoteVersion.id, providerOrganizationId: providerOrganization.id, clientOrganizationId: clientOrganization.id, decidedByUserId: clientUser.id, motivation: 'Fictieve integratietestmotivering.', snapshot: {}, snapshotChecksum: '1'.repeat(64), idempotencyKey: randomUUID() } })

    await assert.rejects(() => prisma!.creditAccount.update({ where: { id: account.id }, data: { balance: -1, availableBalance: -1 } }))
    await assert.rejects(() => prisma!.creditReservation.update({ where: { id: reservation.id }, data: { status: 'CONSUMED', consumedAt: new Date(), releasedAt: new Date() } }))
    await assert.rejects(() => prisma!.quoteVersion.update({ where: { id: quoteVersion.id }, data: { planning: 'Overschreven' } }))
    await assert.rejects(() => prisma!.creditTransaction.update({ where: { id: ledger.id }, data: { reason: 'Overschreven' } }))
    await assert.rejects(() => prisma!.awardDecision.create({ data: { assignmentId: assignment.id, quoteId: quote.id, quoteVersionId: quoteVersion.id, providerOrganizationId: providerOrganization.id, clientOrganizationId: clientOrganization.id, decidedByUserId: clientUser.id, motivation: 'Tweede gunning is verboden.', snapshot: {}, snapshotChecksum: '2'.repeat(64), idempotencyKey: randomUUID() } }))
    const eventId = `TEST:${randomUUID()}`
    await prisma.marketplaceNotification.create({ data: { recipientUserId: clientUser.id, eventId, type: 'TEST', title: 'Test', body: 'Fictieve melding.', targetRoute: '/dashboard', idempotencyKey: randomUUID() } })
    await assert.rejects(() => prisma!.marketplaceNotification.create({ data: { recipientUserId: clientUser.id, eventId, type: 'TEST', title: 'Dubbel', body: 'Dubbele melding.', targetRoute: '/dashboard', idempotencyKey: randomUUID() } }))
    const correlationKey = `TEST-AUDIT:${randomUUID()}`
    await prisma.marketplaceAuditEvent.create({ data: { actorUserId: clientUser.id, actorRole: 'OWNER', organizationId: clientOrganization.id, action: 'TEST', entityType: 'Assignment', entityId: assignment.id, correlationKey } })
    await assert.rejects(() => prisma!.marketplaceAuditEvent.create({ data: { actorUserId: clientUser.id, actorRole: 'OWNER', organizationId: clientOrganization.id, action: 'TEST_DUPLICATE', entityType: 'Assignment', entityId: assignment.id, correlationKey } }))
    assert.equal(await prisma.awardDecision.count({ where: { assignmentId: assignment.id } }), 1)
    console.log('Marktplaatsconstraints voor credits, offertes, gunning, audit, historie en notificaties zijn geslaagd.')
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende marktplaatstestfout.')
  process.exitCode = 1
})
