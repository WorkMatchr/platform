import { standardTasks } from '../src/lib/marketplace/assignment-scope'
import { syntheticSafetyScope } from './fixtures/launch-scope-policy'
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
    const { getProviderInvitationDetail, getClientQuotes, getProviderQuoteDetail } = await import('../src/lib/marketplace/dashboard-query-service')
    const { saveQuoteDraft, submitQuote } = await import('../src/lib/marketplace/quote-service')
    const { quoteValidityInputDate, quoteExpiryFromSqlDate } = await import('../src/lib/marketplace/quote-validity-date')
    const { awardMarketplaceQuote } = await import('../src/lib/marketplace/award-service')
    const { sendMarketplaceMessage } = await import('../src/lib/marketplace/messaging-service')
    const { correctMarketplaceCredits, grantMarketplaceCredits, reserveCreditsInTransaction } = await import('../src/lib/marketplace/credit-service')
    const { createMarketplaceNotification, enqueueMarketplaceEmail, writeMarketplaceAudit } = await import('../src/lib/marketplace/marketplace-events')
    prisma = getPrisma()

    const clientOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Opdrachtgever', organizationType: 'CLIENT', status: 'ACTIVE' } })
    const providerOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Dienstverlener', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const secondProviderOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Dienstverlener Twee', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const thirdProviderOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Dienstverlener Drie', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const fourthProviderOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Concurrentie Dienstverlener Vier', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const poorProviderOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Onvoldoende credits', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const platformOrganization = await prisma.organization.create({ data: { name: 'TEST-WM-Platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
    const clientUser = await prisma.user.create({ data: { email: `client-${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'CLIENT', emailVerified: true, memberships: { create: { organizationId: clientOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const providerUser = await prisma.user.create({ data: { email: `provider-${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: providerOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const secondProviderUser = await prisma.user.create({ data: { email: `provider-two-${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: secondProviderOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const thirdProviderUser = await prisma.user.create({ data: { email: `provider-three-${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: thirdProviderOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const fourthProviderUser = await prisma.user.create({ data: { email: `provider-four-${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: fourthProviderOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const poorProviderUser = await prisma.user.create({ data: { email: `provider-poor-${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: poorProviderOrganization.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const platformAdmin = await prisma.user.create({ data: { email: `admin-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerified: true, platformRole: 'ADMIN', memberships: { create: { organizationId: platformOrganization.id, role: 'ADMIN', status: 'ACTIVE' } } } })

    const policy=await syntheticSafetyScope(prisma)
    async function createSelectableProvider(organizationId: string) {
      const profile = await prisma!.providerProfile.create({ data: { organizationId, lifecycleStatus: 'QUALIFIED', readinessStatus: 'READY', platformQualificationStatus: 'QUALIFIED', selectabilityStatus: 'SELECTABLE' } })
      const profileVersion = await (await import('./fixtures/reviewed-marketplace-provider')).prepareReviewedSupplier(prisma!, profile.id, organizationId,policy)
    const readiness = await prisma!.providerReadinessAssessment.create({ data: { providerProfileId: profile.id, status: 'READY', reasonCodes: [], sourceVersion: profileVersion, checksum: randomUUID().replaceAll('-', '').padEnd(64, '0').slice(0, 64) } })
      const selectability = await prisma!.providerSelectabilityAssessment.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, status: 'SELECTABLE', reasonCodes: [], sourceVersion: profileVersion, checksum: randomUUID().replaceAll('-', '').padEnd(64, '1').slice(0, 64) } })
      const projection = await prisma!.trustedProviderProjection.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: profileVersion, payload: { capabilities: [], sectors: [], workAreas: [] }, sha256: randomUUID().replaceAll('-', '').padEnd(64, '2').slice(0, 64), validFrom: new Date(), validUntil: new Date('2096-04-01T00:00:00Z') } })
      return { profile, projection }
    }

    const provider = await createSelectableProvider(providerOrganization.id)
    const secondProvider = await createSelectableProvider(secondProviderOrganization.id)
    const thirdProvider = await createSelectableProvider(thirdProviderOrganization.id)
    const fourthProvider = await createSelectableProvider(fourthProviderOrganization.id)
    const poorProvider = await createSelectableProvider(poorProviderOrganization.id)
    const providerCreditAccount = await prisma.creditAccount.create({ data: { organizationId: providerOrganization.id } })
    const secondProviderCreditAccount = await prisma.creditAccount.create({ data: { organizationId: secondProviderOrganization.id } })
    const thirdProviderCreditAccount = await prisma.creditAccount.create({ data: { organizationId: thirdProviderOrganization.id } })
    const fourthProviderCreditAccount = await prisma.creditAccount.create({ data: { organizationId: fourthProviderOrganization.id } })
    await prisma.creditTransaction.create({ data: { creditAccountId: providerCreditAccount.id, type: 'ADMIN_GRANT', amount: 100, totalDelta: 100, reservedDelta: 0, balanceAfter: 100, reason: 'Fictief beginsaldo voor de concurrencytest.', createdByUserId: providerUser.id, idempotencyKey: randomUUID() } })
    await prisma.creditTransaction.create({ data: { creditAccountId: secondProviderCreditAccount.id, type: 'ADMIN_GRANT', amount: 100, totalDelta: 100, reservedDelta: 0, balanceAfter: 100, reason: 'Fictief beginsaldo voor de concurrencytest.', createdByUserId: secondProviderUser.id, idempotencyKey: randomUUID() } })
    await prisma.creditTransaction.create({ data: { creditAccountId: thirdProviderCreditAccount.id, type: 'ADMIN_GRANT', amount: 100, totalDelta: 100, reservedDelta: 0, balanceAfter: 100, reason: 'Fictief beginsaldo voor de concurrencytest.', createdByUserId: thirdProviderUser.id, idempotencyKey: randomUUID() } })
    await prisma.creditTransaction.create({ data: { creditAccountId: fourthProviderCreditAccount.id, type: 'ADMIN_GRANT', amount: 100, totalDelta: 100, reservedDelta: 0, balanceAfter: 100, reason: 'Fictief beginsaldo voor de concurrencytest.', createdByUserId: fourthProviderUser.id, idempotencyKey: randomUUID() } })

    async function createInvitation(providerData: typeof provider, providerOrganizationId: string, assignmentId?: string) {
      let assignment = assignmentId
        ? await prisma!.assignment.findUniqueOrThrow({ where: { id: assignmentId } })
        : await prisma!.assignment.create({ data: { clientOrganizationId: clientOrganization.id, createdByUserId: clientUser.id, title:standardTasks.SAFETY_ADVICE.title,description:standardTasks.SAFETY_ADVICE.task,primarySpecialismId:policy.specialismId } })
      if (!assignmentId) {
        const publishedAt = new Date()
        assignment = await prisma!.$transaction(async (transaction) => {
          await transaction.assignmentRevision.create({ data: { assignmentId: assignment.id, version: 1, primarySpecialismId:policy.specialismId,title: assignment.title, description: assignment.description, locationType: 'UNKNOWN', allowsRemoteWork: false, changedByUserId: clientUser.id } })
          await transaction.assignment.update({ where: { id: assignment.id }, data: { status: 'OPEN', publishedAt, publishedByUserId: clientUser.id, publishedVersion: 1 } })
          await transaction.assignmentStatusHistory.create({ data: { assignmentId: assignment.id, fromStatus: 'READY_FOR_REVIEW', toStatus: 'OPEN', changedByUserId: clientUser.id, reason: 'Fictieve publicatie voor concurrencytest.', createdAt: publishedAt } })
          return transaction.assignment.update({ where: { id: assignment.id }, data: { status: 'AWAITING_RESPONSES' } })
        })
      }
      const {readAssignmentScope,requireWithin}=await import('../src/lib/marketplace/assignment-scope-service')
      const scope=await prisma!.$transaction(tx=>readAssignmentScope(tx,assignment.id,'SAFETY_ADVICE',new Date()));requireWithin(scope)
      const run = await prisma!.marketplaceMatchRun.create({ data: { assignmentId: assignment.id, assignmentVersion: assignment.version, engineVersion: 'test', modelVersion: 'test', ruleVersion: 'test', taxonomyVersion: 'test', startedByUserId: clientUser.id, idempotencyKey: randomUUID(), confidenceLevel: 'HOOG', confidenceReasons: [], assignmentSnapshot: {scopeDigest:scope.digest,scopeService:scope.service,capabilityCode:'hogere-veiligheidskundige'}, inputChecksum: randomUUID().replaceAll('-', '').padEnd(64, '3').slice(0, 64) } })
      const candidate = await prisma!.marketplaceMatchCandidate.create({ data: { matchRunId: run.id, providerProfileId: providerData.profile.id, projectionId: providerData.projection.id, status: 'SELECTED', rank: 1, scoreNumerator: 1, scoreDenominator: 1, normalizedScore: 10_000, exclusionReasons: [], explanation: {}, providerSnapshot: {}, snapshotChecksum: randomUUID().replaceAll('-', '').padEnd(64, '4').slice(0, 64) } })
      await prisma!.assignmentProviderSelection.create({ data: { assignmentId: assignment.id, providerProfileId: providerData.profile.id, source: 'AUTOMATIC', status: 'INVITED', selectedByUserId: clientUser.id } })
      const invitation = await prisma!.providerInvitation.create({ data: { assignmentId: assignment.id, matchRunId: run.id, matchCandidateId: candidate.id, providerProfileId: providerData.profile.id, providerOrganizationId, creditCost: 25, deadlineAt: new Date(Date.now() + 86_400_000), snapshot: {recipientExpertise:'hogere-veiligheidskundige'}, snapshotChecksum: randomUUID().replaceAll('-', '').padEnd(64, '5').slice(0, 64), idempotencyKey: randomUUID() } })
      return { assignment, invitation }
    }

    const acceptanceFixture = await createInvitation(provider, providerOrganization.id)
    const previewOnly = await getProviderInvitationDetail(providerUser.id, providerOrganization.id, acceptanceFixture.invitation.id)
    assert.equal(previewOnly.invitation.fullAssignment, null)
    assert.equal('description' in previewOnly.invitation.preview, false)
    assert.equal(previewOnly.invitation.preview.priceCredits, 25)
    const acceptanceRace = await Promise.allSettled([
      acceptProviderInvitation({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, invitationId: acceptanceFixture.invitation.id, idempotencyKey: randomUUID() }),
      acceptProviderInvitation({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, invitationId: acceptanceFixture.invitation.id, idempotencyKey: randomUUID() }),
    ])
    raceResult('Dubbele uitnodigingsacceptatie', acceptanceRace)
    const acceptedParticipation = await prisma.providerParticipation.findUniqueOrThrow({ where: { invitationId: acceptanceFixture.invitation.id }, include: { creditReservation: true } })
    const fullAccess = await getProviderInvitationDetail(providerUser.id, providerOrganization.id, acceptanceFixture.invitation.id)
    assert.equal(fullAccess.invitation.fullAssignment?.description, standardTasks.SAFETY_ADVICE.task)
    assert.equal(await prisma.providerParticipation.count({ where: { invitationId: acceptanceFixture.invitation.id } }), 1)
    assert.equal(acceptedParticipation.creditReservation, null)
    assert.equal((await prisma.providerInvitation.findUniqueOrThrow({ where: { id: acceptanceFixture.invitation.id } })).status, 'ACCEPTED')
    assert.equal(await prisma.creditTransaction.count({ where: { referenceId: acceptedParticipation.id, type: 'PARTICIPATION_PAYMENT', amount: -25 } }), 1)
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
    const thirdInvitation = await createInvitation(thirdProvider, thirdProviderOrganization.id, acceptanceFixture.assignment.id)
    const fourthInvitation = await createInvitation(fourthProvider, fourthProviderOrganization.id, acceptanceFixture.assignment.id)
    await acceptProviderInvitation({ actorUserId: thirdProviderUser.id, providerOrganizationId: thirdProviderOrganization.id, invitationId: thirdInvitation.invitation.id, idempotencyKey: randomUUID() })
    await assert.rejects(() => acceptProviderInvitation({ actorUserId: fourthProviderUser.id, providerOrganizationId: fourthProviderOrganization.id, invitationId: fourthInvitation.invitation.id, idempotencyKey: randomUUID() }), (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'FULL'))
    assert.equal((await prisma.creditAccount.findUniqueOrThrow({ where: { organizationId: fourthProviderOrganization.id } })).availableBalance, 100)
    assert.equal(await prisma.providerParticipation.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 3)

    const insufficientFixture = await createInvitation(poorProvider, poorProviderOrganization.id)
    await assert.rejects(() => acceptProviderInvitation({ actorUserId: poorProviderUser.id, providerOrganizationId: poorProviderOrganization.id, invitationId: insufficientFixture.invitation.id, idempotencyKey: randomUUID() }), (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'INSUFFICIENT_CREDITS'))
    assert.equal(await prisma.providerParticipation.count({ where: { invitationId: insufficientFixture.invitation.id } }), 0)
    assert.equal(await prisma.marketplaceMessageChannel.count({ where: { assignmentId: insufficientFixture.assignment.id } }), 0)
    const secondQuote = await saveQuoteDraft({ actorUserId: secondProviderUser.id, providerOrganizationId: secondProviderOrganization.id, participationId: secondParticipation.id, expectedQuoteVersion: 0, content: { priceCents: 30_000, priceExplanation: 'Een tweede transparante fictieve testprijs.', approach: 'Een tweede concrete en controleerbare aanpak voor de test.', planning: 'Uitvoering binnen zes weken.', validUntil: '2096-03-31' } })
    const quote = await saveQuoteDraft({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, participationId: acceptedParticipation.id, expectedQuoteVersion: 0, content: { priceCents: 25_000, priceExplanation: 'Een transparante fictieve testprijs.', approach: 'Een concrete en controleerbare fictieve aanpak voor deze test.', planning: 'Uitvoering binnen vier weken.', validUntil: '2096-03-31' } })
    const thirdParticipation = await prisma.providerParticipation.findUniqueOrThrow({ where: { invitationId: thirdInvitation.invitation.id } })
    const draftInput = { actorUserId: thirdProviderUser.id, providerOrganizationId: thirdProviderOrganization.id, participationId: thirdParticipation.id, expectedQuoteVersion: 0, content: { priceCents: 30000, priceExplanation: 'Synthetische prijs voor een nog niet ingediende offerte.', approach: 'Een volledige aanpak die nog niet is ingediend.', planning: 'Uitvoering in gezamenlijk overleg.' } }
    const unsubmitted = await saveQuoteDraft(draftInput)
    const quoteKey = randomUUID()
    const quoteRace = await Promise.allSettled([
      submitQuote({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, quoteId: quote.id, expectedQuoteVersion: 1, idempotencyKey: quoteKey }),
      submitQuote({ actorUserId: providerUser.id, providerOrganizationId: providerOrganization.id, quoteId: quote.id, expectedQuoteVersion: 1, idempotencyKey: quoteKey }),
    ])
    raceResult('Dubbele offerte-indiening en creditconsumptie', quoteRace)
    const submittedQuote = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id }, include: { participation: { include: { creditReservation: true } } } })
    assert.equal(submittedQuote.status, 'SUBMITTED')
    assert.equal(submittedQuote.participation.creditReservation, null)
    assert.equal(await prisma.creditTransaction.count({ where: { referenceId: submittedQuote.participation.id, type: 'PARTICIPATION_PAYMENT' } }), 1)
    assert.equal(await prisma.creditTransaction.count({ where: { referenceId: submittedQuote.participation.id, type: 'CONSUMPTION' } }), 0)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { action: 'QUOTE_SUBMITTED', entityId: quote.id } }), 1)

    const secondVersion = await prisma.quoteVersion.findUniqueOrThrow({ where: { id: secondQuote.currentVersionId! } })
    const originalDate = secondVersion.validUntil!
    assert.equal(originalDate.toISOString(), '2096-03-31T00:00:00.000Z')
    assert.equal(quoteExpiryFromSqlDate(originalDate).toISOString(), '2096-03-31T22:00:00.000Z')
    const revised = await saveQuoteDraft({
      actorUserId: secondProviderUser.id, providerOrganizationId: secondProviderOrganization.id,
      participationId: secondParticipation.id, expectedQuoteVersion: secondQuote.version,
      content: {
        priceCents: Number(secondVersion.priceCents), priceExplanation: secondVersion.priceExplanation,
        approach: secondVersion.approach, planning: secondVersion.planning, terms: 'Gewijzigde synthetische voorwaarden.',
        validUntil: quoteValidityInputDate(originalDate),
      },
    })
    const savedVersion = await prisma.quoteVersion.findUniqueOrThrow({ where: { id: revised.currentVersionId! } })
    assert.equal(savedVersion.validUntil?.getTime(), originalDate.getTime())
    assert.notEqual(savedVersion.id, secondVersion.id)
    const secondSubmission = { actorUserId: secondProviderUser.id, providerOrganizationId: secondProviderOrganization.id, quoteId: secondQuote.id, expectedQuoteVersion: revised.version, idempotencyKey: randomUUID() }
    await assert.rejects(submitQuote({ ...secondSubmission, now: new Date(Date.now() + 2 * 86_400_000) }), { code: 'DEADLINE_PASSED' })
    await submitQuote(secondSubmission)
    const channel = await prisma.marketplaceMessageChannel.findFirstOrThrow({ where: { participationId: acceptedParticipation.id } })
    const messageInput = { actorUserId: providerUser.id, organizationId: providerOrganization.id, channelId: channel.id, content: 'Uitsluitend synthetisch testbericht.', idempotencyKey: randomUUID() }
    const message = await sendMarketplaceMessage(messageInput)
    assert.equal((await sendMarketplaceMessage(messageInput)).id, message.id)
    await assert.rejects(() => sendMarketplaceMessage({ ...messageInput, actorUserId: secondProviderUser.id, organizationId: secondProviderOrganization.id }), { code: 'ACCESS_DENIED' })
    assert.equal(await prisma.marketplaceMessage.count({ where: { idempotencyKey: messageInput.idempotencyKey } }), 1)
    await assert.rejects(awardMarketplaceQuote({ actorUserId: clientUser.id, clientOrganizationId: clientOrganization.id, assignmentId: acceptanceFixture.assignment.id, quoteId: secondQuote.id, motivation: 'Verlopen offerte mag niet gegund worden.', idempotencyKey: randomUUID(), now: new Date('2096-03-31T22:00:00.000Z') }), { code: 'DEADLINE_PASSED' })
    assert.equal(await prisma.awardDecision.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 0)
    const awardKey = randomUUID()
    const lastValidInstant = new Date('2096-03-31T21:59:59.999Z')
    const awardRace = await Promise.allSettled([
      awardMarketplaceQuote({ actorUserId: clientUser.id, clientOrganizationId: clientOrganization.id, assignmentId: acceptanceFixture.assignment.id, quoteId: quote.id, motivation: 'Deze fictieve offerte past aantoonbaar het beste.', idempotencyKey: awardKey, now: lastValidInstant }),
      awardMarketplaceQuote({ actorUserId: clientUser.id, clientOrganizationId: clientOrganization.id, assignmentId: acceptanceFixture.assignment.id, quoteId: quote.id, motivation: 'Deze fictieve offerte past aantoonbaar het beste.', idempotencyKey: awardKey, now: lastValidInstant }),
    ])
    raceResult('Dubbele gunning', awardRace)
    assert.equal(await prisma.awardDecision.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 1)
    assert.equal((await prisma.assignment.findUniqueOrThrow({ where: { id: acceptanceFixture.assignment.id } })).status, 'AWARDED')
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status, 'AWARDED')
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: secondQuote.id } })).status, 'REJECTED')
    assert.equal(await prisma.assignmentResolution.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { action: 'QUOTE_AWARDED', organizationId: clientOrganization.id } }), 1)
    await assert.rejects(saveQuoteDraft({ ...draftInput, expectedQuoteVersion: unsubmitted.version }), { code: 'INVALID_STATE' })
    assert.equal(await prisma.quoteVersion.count({ where: { quoteId: unsubmitted.id } }), 1)
    assert.equal(await prisma.marketplaceNotification.count({ where: { recipientUserId: thirdProviderUser.id, type: 'QUOTE_REJECTED' } }), 0, 'A never-submitted draft is not a rejected offer')
    // Direct service entry points must not rewrite pre-existing commercial obligations.
    const { registerRequestInterest } = await import('../src/lib/requests/request-interest-service')
    const { claimRequestOfferSlot } = await import('../src/lib/requests/request-offer-slot-service')
    const history = () => prisma!.$transaction([
      prisma!.creditTransaction.findMany({ where: { creditAccountId: providerCreditAccount.id }, orderBy: { id: 'asc' } }),
      prisma!.creditReservation.findUniqueOrThrow({ where: { participationId: manualParticipation.id } }),
      prisma!.quoteVersion.findMany({ where: { quoteId: { in: [quote.id, secondQuote.id] } }, orderBy: { id: 'asc' } }),
      prisma!.awardDecision.findFirstOrThrow({ where: { assignmentId: acceptanceFixture.assignment.id } }),
    ])
    const beforeRetiredCalls = await history()
    assert.equal(beforeRetiredCalls[1].status, 'ACTIVE')
    assert.equal(beforeRetiredCalls[1].amount, 10)
    const archivedInput = { actor: { userId: providerUser.id, organizationId: providerOrganization.id }, requestId: acceptanceFixture.assignment.id }
    await Promise.all([registerRequestInterest, claimRequestOfferSlot].map(call =>
      assert.rejects(call(archivedInput), { code: 'LEGACY_ROUTE_CLOSED' })))
    assert.deepEqual(await history(), beforeRetiredCalls)
    console.log('Historische afschrijving, actieve reservering, offerteversies en gunning ongewijzigd na directe oude serviceaanroepen.')
    const awardInput = { actorUserId: clientUser.id, clientOrganizationId: clientOrganization.id, assignmentId: acceptanceFixture.assignment.id, quoteId: quote.id, motivation: 'Deze fictieve offerte past aantoonbaar het beste.', idempotencyKey: awardKey }
    assert.equal((await awardMarketplaceQuote(awardInput)).quoteId, quote.id)
    await assert.rejects(() => awardMarketplaceQuote({ ...awardInput, actorUserId: secondProviderUser.id, clientOrganizationId: secondProviderOrganization.id }), { code: 'ACCESS_DENIED' })
    await assert.rejects(() => awardMarketplaceQuote({ ...awardInput, quoteId: secondQuote.id }), { code: 'ACCESS_DENIED' })
    await prisma.organizationMembership.updateMany({ where: { userId: clientUser.id, organizationId: clientOrganization.id }, data: { status: 'SUSPENDED' } })
    await assert.rejects(() => awardMarketplaceQuote(awardInput), { code: 'ACCESS_DENIED' })
    await prisma.organizationMembership.updateMany({ where: { userId: clientUser.id, organizationId: clientOrganization.id }, data: { status: 'ACTIVE' } })
    await prisma.organization.update({ where: { id: clientOrganization.id }, data: { status: 'SUSPENDED' } })
    await assert.rejects(() => getClientQuotes(clientUser.id, clientOrganization.id, acceptanceFixture.assignment.id), { code: 'ACCESS_DENIED' })
    await assert.rejects(() => sendMarketplaceMessage(messageInput), { code: 'ACCESS_DENIED' })
    await prisma.organization.update({ where: { id: clientOrganization.id }, data: { status: 'ACTIVE' } })
    await prisma.organization.update({ where: { id: providerOrganization.id }, data: { status: 'SUSPENDED' } })
    await assert.rejects(() => getProviderQuoteDetail(providerUser.id, providerOrganization.id, quote.id), { code: 'ACCESS_DENIED' })
    await prisma.organization.update({ where: { id: providerOrganization.id }, data: { status: 'ACTIVE' } })
    console.log('Replay-autorisatie: eigen herhaling één resultaat; vreemde tenant, andere offerte en ingetrokken membership geweigerd.')

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
    assert.equal(await prisma.providerParticipation.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 3)
    assert.equal(await prisma.quote.count({ where: { assignmentId: acceptanceFixture.assignment.id } }), 3)
    // Four distinct organisations compete for the three configured places.
    const competitors = [
      { org: providerOrganization, user: providerUser, data: provider },
      { org: secondProviderOrganization, user: secondProviderUser, data: secondProvider },
      { org: thirdProviderOrganization, user: thirdProviderUser, data: thirdProvider },
      { org: fourthProviderOrganization, user: fourthProviderUser, data: fourthProvider },
    ]
    const race = await createInvitation(provider, providerOrganization.id)
    assert.equal(race.assignment.maxSelections, 3)
    const entries = [race]
    for (const competitor of competitors.slice(1)) {
      entries.push(await createInvitation(competitor.data, competitor.org.id, race.assignment.id))
    }
    const claim = (index: number) => acceptProviderInvitation({
      actorUserId: competitors[index].user.id, providerOrganizationId: competitors[index].org.id,
      invitationId: entries[index].invitation.id, idempotencyKey: randomUUID(),
    })
    const one = await claim(0)
    const two = await claim(1)
    const balance = (i: number) => prisma!.creditAccount.findUniqueOrThrow({ where: { organizationId: competitors[i].org.id } })
    const before = await Promise.all([balance(2), balance(3)])
    const last = await Promise.allSettled([claim(2), claim(3)])
    assert.equal(last.filter(result => result.status === 'fulfilled').length, 1)
    for (const [i,result] of last.entries()) {
      const won = result.status === 'fulfilled'
      assert.equal((await balance(i+2)).availableBalance, before[i].availableBalance - (won ? 25 : 0))
      if (!won) await assert.rejects(claim(i+2), { code: 'FULL' })
    }
    assert.equal(await prisma.providerParticipation.count({where:{assignmentId:race.assignment.id}}),3)
    const contenders = []
    for (const [i, participation] of [one,two].entries()) {
      const buyer = { actorUserId: competitors[i].user.id, providerOrganizationId: competitors[i].org.id }
      const draft = await saveQuoteDraft({ ...draftInput, ...buyer, participationId:participation.id,
        content:{ ...draftInput.content, validUntil:'2096-03-31' } })
      await submitQuote({...buyer, quoteId:draft.id, expectedQuoteVersion:draft.version, idempotencyKey:randomUUID()})
      contenders.push(draft.id)
    }
    const manager = await prisma.user.create({data:{email:randomUUID()+'@example.invalid',accountType:'CLIENT',status:'ACTIVE',
      emailVerified:true,memberships:{create:{organizationId:clientOrganization.id,status:'ACTIVE',role:'ADMIN'}}}})
    const decisions = await Promise.allSettled(contenders.map((quoteId,i) => awardMarketplaceQuote({
      ...awardInput, actorUserId:i===0 ? clientUser.id : manager.id, assignmentId:race.assignment.id, quoteId, idempotencyKey:randomUUID(),
    })))
    assert.equal(decisions.filter(result=>result.status==='fulfilled').length,1)
    const offers = await prisma.quote.findMany({where:{assignmentId:race.assignment.id},select:{status:true}})
    assert.deepEqual(offers.map(offer=>offer.status).sort(),['AWARDED','REJECTED'])
    assert.equal(await prisma.awardDecision.count({where:{assignmentId:race.assignment.id}}),1)
    const finalAward = await prisma.awardDecision.findUniqueOrThrow({where:{assignmentId:race.assignment.id}})
    const otherOffer = contenders.find(id=>id!==finalAward.quoteId)!
    const changes = await Promise.allSettled([
      prisma.awardDecision.update({where:{id:finalAward.id},data:{quoteId:otherOffer}}),
      prisma.awardDecision.delete({where:{id:finalAward.id}}),
    ])
    assert.ok(changes.every(result=>result.status==='rejected'))
    assert.deepEqual(await prisma.awardDecision.findUniqueOrThrow({where:{id:finalAward.id}}),finalAward)
    console.log('PASS laatste plaats tussen twee organisaties en verschillende gunningen door twee beheerders')

    const { withdrawProviderParticipation } = await import('../src/lib/marketplace/participation-service')
    await withdrawProviderParticipation({ actorUserId:providerUser.id,providerOrganizationId:providerOrganization.id,
      participationId:manualParticipation.id,expectedVersion:manualParticipation.version,reason:'Synthetische intrekking van de deelname.',idempotencyKey:randomUUID() })
    const withdrawn = await getProviderInvitationDetail(providerUser.id, providerOrganization.id, reservationFixture.invitation.id)
    assert.equal(withdrawn.invitation.fullAssignment, null, 'Een vrijgegeven reservering mag geen contactgegevens ontsluiten')
    // A changed assignment cannot progress even after a provider has already paid.
    const stale = await createInvitation(fourthProvider, fourthProviderOrganization.id)
    const bought = await acceptProviderInvitation({ actorUserId: fourthProviderUser.id, providerOrganizationId: fourthProviderOrganization.id, invitationId: stale.invitation.id, idempotencyKey: randomUUID() })
    const staleDraft = { ...draftInput, actorUserId: fourthProviderUser.id, providerOrganizationId: fourthProviderOrganization.id, participationId: bought.id }
    const stored = await saveQuoteDraft(staleDraft)
    const staleSubmit = { actorUserId: fourthProviderUser.id, providerOrganizationId: fourthProviderOrganization.id, quoteId: stored.id, expectedQuoteVersion: stored.version, idempotencyKey: randomUUID() }
    await prisma.organization.update({where:{id:fourthProviderOrganization.id},data:{status:'SUSPENDED'}})
    await assert.rejects(submitQuote(staleSubmit), {code:'ACCESS_DENIED'})
    await assert.rejects(getProviderInvitationDetail(fourthProviderUser.id,fourthProviderOrganization.id,stale.invitation.id), {code:'ACCESS_DENIED'})
    assert.equal((await prisma.quote.findUniqueOrThrow({where:{id:stored.id}})).status,'DRAFT')
    await prisma.organization.update({where:{id:fourthProviderOrganization.id},data:{status:'ACTIVE'}})
    const staleAwardFixture = await createInvitation(fourthProvider, fourthProviderOrganization.id)
    const awardParticipation = await acceptProviderInvitation({ actorUserId: fourthProviderUser.id, providerOrganizationId: fourthProviderOrganization.id, invitationId: staleAwardFixture.invitation.id, idempotencyKey: randomUUID() })
    const awardDraft = await saveQuoteDraft({ ...staleDraft, participationId: awardParticipation.id })
    await submitQuote({ ...staleSubmit, quoteId: awardDraft.id, expectedQuoteVersion: awardDraft.version, idempotencyKey: randomUUID() })
    await assert.rejects(
      prisma.assignment.update({ where: { id: stale.assignment.id }, data: { description: 'Gewijzigde gepubliceerde inhoud.' } }),
      /immutable/,
    )
    // Withdraw the mapped specialism after purchase and submission, with all database triggers enabled.
    await prisma.specialism.update({ where: { id: policy.specialismId }, data: { isActive: false } })
    await assert.rejects(saveQuoteDraft({ ...staleDraft, expectedQuoteVersion: stored.version }), { code: 'NOT_SELECTABLE' })
    await assert.rejects(getProviderInvitationDetail(fourthProviderUser.id, fourthProviderOrganization.id, stale.invitation.id), { code: 'NOT_SELECTABLE' })
    await assert.rejects(submitQuote(staleSubmit), { code: 'NOT_SELECTABLE' })
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: stored.id } })).status, 'DRAFT')
    assert.equal(await prisma.creditTransaction.count({ where: { referenceId: bought.id, type: 'PARTICIPATION_PAYMENT' } }), 1)
    await assert.rejects(awardMarketplaceQuote({ ...awardInput, assignmentId: staleAwardFixture.assignment.id, quoteId: awardDraft.id, idempotencyKey: randomUUID() }), { code: 'NOT_SELECTABLE' })
    assert.equal(await prisma.awardDecision.count({ where: { assignmentId: staleAwardFixture.assignment.id } }), 0)
    console.log('PASS scopewijziging na betaling of indiening blokkeert opslaan, indienen en gunnen.')
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
