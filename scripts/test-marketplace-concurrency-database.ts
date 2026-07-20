import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) throw new Error('De concurrencytest mag uitsluitend lokaal draaien.')
const databaseName = `workmatchr_marketplace_concurrency_${process.pid}_${Date.now()}`
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
  if (result.status !== 0) throw new Error(`Migraties in concurrencytestdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
}

function raceResult(label: string, results: PromiseSettledResult<unknown>[]) {
  const fulfilled = results.filter((result) => result.status === 'fulfilled').length
  const rejected = results.length - fulfilled
  console.log(`${label}: ${fulfilled} voltooid, ${rejected} gecontroleerd afgewezen.`)
  assert.ok(fulfilled >= 1, `${label} moet ten minste één succesvolle uitvoering hebben.`)
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
    const { acceptProviderInvitation } = await import('../src/lib/marketplace/participation-service')
    const { saveQuoteDraft, submitQuote } = await import('../src/lib/marketplace/quote-service')
    const { awardMarketplaceQuote } = await import('../src/lib/marketplace/award-service')
    const { correctMarketplaceCredits, grantMarketplaceCredits, reserveCreditsInTransaction } = await import('../src/lib/marketplace/credit-service')
    const { createMarketplaceNotification, enqueueMarketplaceEmail, writeMarketplaceAudit } = await import('../src/lib/marketplace/marketplace-events')
    prisma = getPrisma()

    const clientOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Opdrachtgever', organizationType: 'CLIENT', status: 'ACTIVE' } })
    const providerOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Dienstverlener', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const secondProviderOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Dienstverlener Twee', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const platformOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
    const clientUser = await prisma.user.create({ data: { email: `client-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, memberships: { create: { organizationId: clientOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const providerUser = await prisma.user.create({ data: { email: `provider-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, memberships: { create: { organizationId: providerOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const secondProviderUser = await prisma.user.create({ data: { email: `provider-two-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, memberships: { create: { organizationId: secondProviderOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const platformAdmin = await prisma.user.create({ data: { email: `admin-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, platformRole: 'ADMIN', memberships: { create: { organizationId: platformOrganization.id, role: 'ADMIN', status: 'ACTIVE' } } } })

    async function createSelectableProvider(organizationId: string) {
      const profile = await prisma!.providerProfile.create({ data: { organizationId, lifecycleStatus: 'QUALIFIED', readinessStatus: 'READY', platformQualificationStatus: 'QUALIFIED', selectabilityStatus: 'SELECTABLE' } })
      const readiness = await prisma!.providerReadinessAssessment.create({ data: { providerProfileId: profile.id, status: 'READY', reasonCodes: [], sourceVersion: 1, checksum: randomUUID().replaceAll('-', '').padEnd(64, '0').slice(0, 64) } })
      const selectability = await prisma!.providerSelectabilityAssessment.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, status: 'SELECTABLE', reasonCodes: [], sourceVersion: 1, checksum: randomUUID().replaceAll('-', '').padEnd(64, '1').slice(0, 64) } })
      const projection = await prisma!.trustedProviderProjection.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1, payload: { capabilities: [], sectors: [], workAreas: [] }, sha256: randomUUID().replaceAll('-', '').padEnd(64, '2').slice(0, 64), validFrom: new Date(), validUntil: new Date(Date.now() + 86_400_000) } })
      return { profile, projection }
    }

    const provider = await createSelectableProvider(providerOrganization.id)
    const secondProvider = await createSelectableProvider(secondProviderOrganization.id)
    await prisma.creditAccount.create({ data: { organizationId: providerOrganization.id, balance: 100, availableBalance: 100 } })
    await prisma.creditAccount.create({ data: { organizationId: secondProviderOrganization.id, balance: 100, availableBalance: 100 } })

    async function createInvitation(providerData: typeof provider, providerOrganizationId: string, assignmentId?: string) {
      let assignment = assignmentId
        ? await prisma!.assignment.findUniqueOrThrow({ where: { id: assignmentId } })
        : await prisma!.assignment.create({ data: { clientOrganizationId: clientOrganization.id, createdByUserId: clientUser.id, title: 'TEST-WM concurrencyopdracht', description: 'Volledig fictieve concurrencytest.' } })
      if (!assignmentId) {
        const publishedAt = new Date()
        assignment = await prisma!.$transaction(async (transaction) => {
          await transaction.assignmentRevision.create({ data: { assignmentId: assignment.id, version: 1, title: assignment.title, description: assignment.description, allowsRemoteWork: false, changedByUserId: clientUser.id } })
          await transaction.assignment.update({ where: { id: assignment.id }, data: { status: 'OPEN', publishedAt, publishedByUserId: clientUser.id, publishedVersion: 1 } })
          await transaction.assignmentStatusHistory.create({ data: { assignmentId: assignment.id, fromStatus: 'READY_FOR_REVIEW', toStatus: 'OPEN', changedByUserId: clientUser.id, reason: 'Fictieve publicatie voor concurrencytest.', createdAt: publishedAt } })
          return transaction.assignment.update({ where: { id: assignment.id }, data: { status: 'AWAITING_RESPONSES' } })
        })
      }
      const run = await prisma!.marketplaceMatchRun.create({ data: { assignmentId: assignment.id, assignmentVersion: assignment.version, engineVersion: 'test', modelVersion: 'test', ruleVersion: 'test', taxonomyVersion: 'test', startedByUserId: clientUser.id, idempotencyKey: randomUUID(), confidenceLevel: 'HOOG', confidenceReasons: [], assignmentSnapshot: {}, inputChecksum: randomUUID().replaceAll('-', '').padEnd(64, '3').slice(0, 64) } })
      const candidate = await prisma!.marketplaceMatchCandidate.create({ data: { matchRunId: run.id, providerProfileId: providerData.profile.id, projectionId: providerData.projection.id, status: 'SELECTED', rank: 1, scoreNumerator: 1, scoreDenominator: 1, normalizedScore: 10_000, exclusionReasons: [], explanation: {}, providerSnapshot: {}, snapshotChecksum: randomUUID().replaceAll('-', '').padEnd(64, '4').slice(0, 64) } })
      await prisma!.assignmentProviderSelection.create({ data: { assignmentId: assignment.id, providerProfileId: providerData.profile.id, source: 'AUTOMATIC', status: 'INVITED', selectedByUserId: clientUser.id } })
      const invitation = await prisma!.providerInvitation.create({ data: { assignmentId: assignment.id, matchRunId: run.id, matchCandidateId: candidate.id, providerProfileId: providerData.profile.id, providerOrganizationId, creditCost: 10, deadlineAt: new Date(Date.now() + 86_400_000), snapshot: {}, snapshotChecksum: randomUUID().replaceAll('-', '').padEnd(64, '5').slice(0, 64), idempotencyKey: randomUUID() } })
      return { assignment, invitation }
    }

    const acceptanceFixture = await createInvitation(provider, providerOrganization.id)
    const acceptanceRace = await Promise.allSettled([
      acceptProviderInvitation({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, invitationId: acceptanceFixture.invitation.id, idempotencyKey: randomUUID() }),
      acceptProviderInvitation({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, invitationId: acceptanceFixture.invitation.id, idempotencyKey: randomUUID() }),
    ])
    raceResult('Dubbele uitnodigingsacceptatie', acceptanceRace)
    const acceptedParticipation = await prisma.providerParticipation.findUniqueOrThrow({ where: { invitationId: acceptanceFixture.invitation.id }, include: { creditReservation: true } })
    assert.equal(await prisma.providerParticipation.count({ where: { invitationId: acceptanceFixture.invitation.id } }), 1)
    assert.equal(acceptedParticipation.creditReservation?.status, 'ACTIVE')
    assert.equal((await prisma.providerInvitation.findUniqueOrThrow({ where: { id: acceptanceFixture.invitation.id } })).status, 'ACCEPTED')
    assert.equal(await prisma.creditTransaction.count({ where: { reservationId: acceptedParticipation.creditReservation!.id, type: 'RESERVATION' } }), 1)
    assert.equal(await prisma.marketplaceMessageChannel.count({ where: { participationId: acceptedParticipation.id } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { action: 'INVITATION_ACCEPTED', entityId: acceptedParticipation.id } }), 1)

    const reservationFixture = await createInvitation(provider, providerOrganization.id)
    const manualParticipation = await prisma.providerParticipation.create({ data: { assignmentId: reservationFixture.assignment.id, invitationId: reservationFixture.invitation.id, providerProfileId: provider.profile.id, providerOrganizationId: providerOrganization.id, createdByUserId: providerUser.id, idempotencyKey: randomUUID() } })
    const reservationRace = await Promise.allSettled([
      prisma.$transaction((transaction) => reserveCreditsInTransaction(transaction, { organizationId: providerOrganization.id, participationId: manualParticipation.id, amount: 10, idempotencyKey: randomUUID(), actorUserId: providerUser.id }), { isolationLevel: 'Serializable' }),
      prisma.$transaction((transaction) => reserveCreditsInTransaction(transaction, { organizationId: providerOrganization.id, participationId: manualParticipation.id, amount: 10, idempotencyKey: randomUUID(), actorUserId: providerUser.id }), { isolationLevel: 'Serializable' }),
    ])
    raceResult('Dubbele deelname en creditreservering', reservationRace)
    assert.equal(await prisma.creditReservation.count({ where: { participationId: manualParticipation.id } }), 1)
    assert.equal(await prisma.creditTransaction.count({ where: { referenceId: manualParticipation.id, type: 'RESERVATION' } }), 1)

    const secondInvitation = await createInvitation(secondProvider, secondProviderOrganization.id, acceptanceFixture.assignment.id)
    const secondParticipation = await acceptProviderInvitation({ actorUserId: secondProviderUser.id, providerOrganizationId: secondProviderOrganization.id, invitationId: secondInvitation.invitation.id, idempotencyKey: randomUUID() })
    const secondQuote = await saveQuoteDraft({ actorUserId: secondProviderUser.id, providerOrganizationId: secondProviderOrganization.id, participationId: secondParticipation.id, expectedQuoteVersion: 0, content: { priceCents: 30_000, priceExplanation: 'Een tweede transparante fictieve testprijs.', approach: 'Een tweede concrete en controleerbare aanpak voor de test.', planning: 'Uitvoering binnen zes weken.' } })
    const quote = await saveQuoteDraft({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, participationId: acceptedParticipation.id, expectedQuoteVersion: 0, content: { priceCents: 25_000, priceExplanation: 'Een transparante fictieve testprijs.', approach: 'Een concrete en controleerbare fictieve aanpak voor deze test.', planning: 'Uitvoering binnen vier weken.' } })
    const quoteKey = randomUUID()
    const quoteRace = await Promise.allSettled([
      submitQuote({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, quoteId: quote.id, expectedQuoteVersion: 1, idempotencyKey: quoteKey }),
      submitQuote({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, quoteId: quote.id, expectedQuoteVersion: 1, idempotencyKey: quoteKey }),
    ])
    raceResult('Dubbele offerte-indiening en creditconsumptie', quoteRace)
    const submittedQuote = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id }, include: { participation: { include: { creditReservation: true } } } })
    assert.equal(submittedQuote.status, 'SUBMITTED')
    assert.equal(submittedQuote.participation.creditReservation?.status, 'CONSUMED')
    assert.equal(await prisma.creditTransaction.count({ where: { reservationId: submittedQuote.participation.creditReservation!.id, type: 'CONSUMPTION' } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { action: 'QUOTE_SUBMITTED', entityId: quote.id } }), 1)

    await submitQuote({ actorUserId: secondProviderUser.id, providerOrganizationId: secondProviderOrganization.id, quoteId: secondQuote.id, expectedQuoteVersion: 1, idempotencyKey: randomUUID() })
    const awardKey = randomUUID()
    const awardRace = await Promise.allSettled([
      awardMarketplaceQuote({ actorUserId: clientUser.id, clientOrganizationId: clientOrganization.id, assignmentId: acceptanceFixture.assignment.id, quoteId: quote.id, motivation: 'Deze fictieve offerte past aantoonbaar het beste.', idempotencyKey: awardKey }),
      awardMarketplaceQuote({ actorUserId: clientUser.id, clientOrganizationId: clientOrganization.id, assignmentId: acceptanceFixture.assignment.id, quoteId: quote.id, motivation: 'Deze fictieve offerte past aantoonbaar het beste.', idempotencyKey: awardKey }),
    ])
    raceResult('Dubbele gunning', awardRace)
    assert.equal(await prisma.awardDecision.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 1)
    assert.equal((await prisma.assignment.findUniqueOrThrow({ where: { id: acceptanceFixture.assignment.id } })).status, 'AWARDED')
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status, 'AWARDED')
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: secondQuote.id } })).status, 'REJECTED')
    assert.equal(await prisma.assignmentResolution.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { action: 'QUOTE_AWARDED', organizationId: clientOrganization.id } }), 1)

    const grantKey = randomUUID()
    const grantRace = await Promise.allSettled([
      grantMarketplaceCredits({ actorUserId: platformAdmin.id, providerOrganizationId: secondProviderOrganization.id, amount: 25, reason: 'Fictieve parallelle acceptatiegrant.', idempotencyKey: grantKey }),
      grantMarketplaceCredits({ actorUserId: platformAdmin.id, providerOrganizationId: secondProviderOrganization.id, amount: 25, reason: 'Fictieve parallelle acceptatiegrant.', idempotencyKey: grantKey }),
    ])
    raceResult('Parallelle admin-creditgrant', grantRace)
    assert.equal(await prisma.creditTransaction.count({ where: { idempotencyKey: grantKey, type: 'ADMIN_GRANT' } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { correlationKey: grantKey } }), 1)
    const correctionKey = randomUUID()
    const correctionRace = await Promise.allSettled([
      correctMarketplaceCredits({ actorUserId: platformAdmin.id, providerOrganizationId: secondProviderOrganization.id, amount: -5, reason: 'Fictieve parallelle acceptatiecorrectie.', idempotencyKey: correctionKey }),
      correctMarketplaceCredits({ actorUserId: platformAdmin.id, providerOrganizationId: secondProviderOrganization.id, amount: -5, reason: 'Fictieve parallelle acceptatiecorrectie.', idempotencyKey: correctionKey }),
    ])
    raceResult('Parallelle admin-creditcorrectie', correctionRace)
    assert.equal(await prisma.creditTransaction.count({ where: { idempotencyKey: correctionKey, type: 'ADMIN_CORRECTION' } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { correlationKey: correctionKey } }), 1)

    const eventId = `CONCURRENCY:${randomUUID()}`
    const eventCorrelation = `CONCURRENCY-EVENT:${randomUUID()}`
    const eventTransaction = () => prisma!.$transaction(async (transaction) => {
      const notification = await createMarketplaceNotification(transaction, { recipientUserId: clientUser.id, eventId, type: 'TEST', title: 'Fictieve racemelding', body: 'Een uitsluitend fictieve acceptatiemelding.', targetRoute: '/dashboard' })
      await enqueueMarketplaceEmail(transaction, { eventId, recipientUserId: clientUser.id, templateKey: 'TEST_ONLY', payload: { test: true } })
      await writeMarketplaceAudit(transaction, { actorUserId: clientUser.id, actorRole: 'OWNER', organizationId: clientOrganization.id, action: 'NOTIFICATION_QUEUED', entityType: 'MarketplaceNotification', entityId: notification.id, correlationKey: eventCorrelation })
    }, { isolationLevel: 'Serializable' })
    const eventRace = await Promise.allSettled([eventTransaction(), eventTransaction()])
    raceResult('Dubbele notificatie- en outboxaanmaak', eventRace)
    assert.equal(await prisma.marketplaceNotification.count({ where: { recipientUserId: clientUser.id, eventId } }), 1)
    assert.equal(await prisma.notificationOutbox.count({ where: { recipientUserId: clientUser.id, eventId } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { correlationKey: eventCorrelation } }), 1)

    for (const organizationId of [providerOrganization.id, secondProviderOrganization.id]) {
      const account: { id: string; balance: number; availableBalance: number; reservedBalance: number; spentBalance: number } = await prisma.creditAccount.findUniqueOrThrow({ where: { organizationId } })
      assert.ok(account.balance >= 0 && account.availableBalance >= 0 && account.reservedBalance >= 0 && account.spentBalance >= 0)
      assert.equal(account.balance, account.availableBalance)
      const activeReservations: { _sum: { amount: number | null } } = await prisma.creditReservation.aggregate({ where: { creditAccountId: account.id, status: 'ACTIVE' }, _sum: { amount: true } })
      assert.equal(account.reservedBalance, activeReservations._sum.amount ?? 0)
      const latestLedger: { availableAfter: number | null; reservedAfter: number | null; spentAfter: number | null } | null = await prisma.creditTransaction.findFirst({ where: { creditAccountId: account.id }, orderBy: { createdAt: 'desc' }, select: { availableAfter: true, reservedAfter: true, spentAfter: true } })
      assert.equal(latestLedger?.availableAfter, account.availableBalance)
      assert.equal(latestLedger?.reservedAfter, account.reservedBalance)
      assert.equal(latestLedger?.spentAfter, account.spentBalance)
    }
    assert.equal(await prisma.providerParticipation.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 2)
    assert.equal(await prisma.quote.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 2)
    console.log('Alle marketplace-races eindigen atomair, zonder negatieve saldi, gedeeltelijke records of dubbele auditgebeurtenissen.')
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende concurrencytestfout.')
  process.exitCode = 1
})
