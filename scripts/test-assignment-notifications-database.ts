import type { Assignment, ProviderInvitation, NotificationOutbox, PrismaClient } from '../src/generated/prisma/client'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'
import type { AuthEmail } from '../src/lib/email'

// This suite never loads .env: require an explicit local database connection.
const source = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname)) throw new Error('LOCAL_DATABASE_REQUIRED')
const databaseName = `workmatchr_notifications_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'; adminUrl.search = ''
const testUrl = new URL(source); testUrl.pathname = `/${databaseName}`
const admin = new Client({ connectionString: adminUrl.href })
await admin.connect()
let keepDatabase = false
let db: PrismaClient | undefined
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  process.env.DATABASE_URL = testUrl.href
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3011'
  for (const script of ['db:deploy', 'db:seed']) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath!, 'run', script], { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
    if (result.status !== 0) throw new Error(`${script}: ${result.stdout} ${result.stderr}`)
  }
  const { getPrisma } = await import('../src/lib/prisma')
  const { runMarketplaceMatching } = await import('../src/lib/marketplace/matching-service')
  const { enqueueAssignmentNotifications } = await import('../src/lib/marketplace/assignment-notification')
  const { toAssignmentPreview } = await import('../src/lib/marketplace/assignment-purchase-preview')
  const { resolveAssignmentPrice } = await import('../src/lib/marketplace/assignment-pricing')
  const { getProviderInvitationDetail } = await import('../src/lib/marketplace/dashboard-query-service')
  const { acceptProviderInvitation } = await import('../src/lib/marketplace/participation-service')
  const { deliverAssignmentEmails } = await import('../src/lib/marketplace/assignment-email-worker')
  const { AuthEmailDeliveryError } = await import('../src/lib/email')
  db = getPrisma()
  const clientOrg = await db.organization.create({ data: { name: 'TEST Notification Client', organizationType: 'CLIENT', status: 'ACTIVE' } })
  const providerOrg = await db.organization.create({ data: { name: 'TEST Notification Provider', organizationType: 'PROVIDER', status: 'ACTIVE' } })
  const client = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'CLIENT', emailVerified: true, memberships: { create: { organizationId: clientOrg.id, status: 'ACTIVE', role: 'OWNER' } } } })
  const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: providerOrg.id, status: 'ACTIVE', role: 'OWNER' } } } })
  const profile = await db.providerProfile.create({ data: { organizationId: providerOrg.id, lifecycleStatus: 'QUALIFIED', readinessStatus: 'READY', platformQualificationStatus: 'QUALIFIED', selectabilityStatus: 'SELECTABLE' } })
  const readiness = await db.providerReadinessAssessment.create({ data: { providerProfileId: profile.id, status: 'READY', reasonCodes: [], sourceVersion: 1, checksum: 'a'.repeat(64) } })
  const selectability = await db.providerSelectabilityAssessment.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, status: 'SELECTABLE', reasonCodes: [], sourceVersion: 1, checksum: 'b'.repeat(64) } })
  await db.trustedProviderProjection.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1, payload: { capabilities: [{ serviceCode: 'OCCUPATIONAL_PHYSICIAN', specialismCode: 'bedrijfsarts', deliveryModes: ['ON_SITE', 'REMOTE'] }], sectors: [], workAreas: [{ regionCode: 'NATIONWIDE' }] }, sha256: 'c'.repeat(64), validFrom: new Date(Date.now() - 60_000), validUntil: new Date(Date.now() + 7 * 86_400_000) } })
  const specialism = await db.specialism.findUniqueOrThrow({ where: { slug: 'bedrijfsarts' } })
  const ruleData = { participationPriceCredits: 25, minimumParticipationPrice: 5, expertiseAdjustments: { bedrijfsarts: 2 }, changeReason: 'Isolated acceptance pricing', status: 'PUBLISHED' as const, createdByUserId: client.id }
  const rule = await db.marketplaceRuleSet.create({ data: { ...ruleData, version: 'test.notifications.1', validFrom: new Date(Date.now() - 60_000) } })
  let fixtureNumber = 0
  async function fixture(): Promise<{ draft: Assignment; invitation: ProviderInvitation; job: NotificationOutbox }> {
    fixtureNumber += 1
    const draft = await db!.assignment.create({ data: { clientOrganizationId: clientOrg.id, createdByUserId: client.id, title: 'Confidential client name, person@example.invalid, Main Street 12', description: 'Private description with telephone 0612345678.', primarySpecialismId: specialism.id, allowsRemoteWork: true, responseDeadline: new Date(Date.now() + 7 * 86_400_000), locationProvince: 'Utrecht', maxSelections: 3 } })
    await db!.$transaction(async tx => {
      const publishedAt = new Date()
      await tx.assignmentRevision.create({ data: { assignmentId: draft.id, version: 1, title: draft.title, description: draft.description, locationType: 'REMOTE', allowsRemoteWork: true, changedByUserId: client.id } })
      await tx.assignment.update({ where: { id: draft.id }, data: { status: 'OPEN', publishedAt, publishedByUserId: client.id, publishedVersion: 1 } })
      await tx.assignmentStatusHistory.create({ data: { assignmentId: draft.id, fromStatus: 'READY_FOR_REVIEW', toStatus: 'OPEN', changedByUserId: client.id, reason: 'Isolated notification test', createdAt: publishedAt } })
    })
    const key = randomUUID()
    const run = await runMarketplaceMatching({ actorUserId: client.id, organizationId: clientOrg.id, assignmentId: draft.id, expectedAssignmentVersion: 1, idempotencyKey: key })
    assert.equal(run.invitations.length, 1, 'existing selection produces one invitation')
    const invitation = run.invitations[0]
    const snapshot = invitation.snapshot as { preview: object }
    await db!.$transaction(tx => enqueueAssignmentNotifications(tx, invitation, toAssignmentPreview(draft, invitation.creditCost, { primaryExpertiseCode: 'bedrijfsarts', recipientExpertise: 'bedrijfsarts', matchType: 'PRIMARY' })))
    assert.equal(await db!.marketplaceNotification.count({ where: { eventId: `INVITATION:${invitation.id}` } }), 1)
    const jobs = await db!.notificationOutbox.findMany({ where: { eventId: `INVITATION:${invitation.id}` } })
    assert.equal(jobs.length, 1)
    assert.ok(snapshot.preview)
    assert.equal(JSON.stringify(jobs[0].payload).includes('Confidential'), false)
    return { draft, invitation, job: jobs[0] }
  }
  const initial = await fixture()
  assert.equal(initial.invitation.creditCost, 27)
  const initialPreview = await getProviderInvitationDetail(user.id, providerOrg.id, initial.invitation.id)
  assert.equal(initialPreview.invitation.preview.priceCredits, 27)
  assert.equal(initialPreview.invitation.fullAssignment, null)
  await assert.rejects(getProviderInvitationDetail(client.id, clientOrg.id, initial.invitation.id))
  await assert.rejects(db.providerInvitation.update({ where: { id: initial.invitation.id }, data: { creditCost: 50 } }))
  await assert.rejects(db.marketplaceRuleSet.update({ where: { id: rule.id }, data: { expertiseAdjustments: { bedrijfsarts: 5 } } }))

  let calls = 0
  const accepted = async (email: AuthEmail) => { calls += 1; assert.equal(email.to, user.email); return { accepted: true as const, transport: 'RESEND' as const, status: 'ACCEPTED' as const, messageId: `fake-${calls}` } }
  const race = await Promise.all([deliverAssignmentEmails({ limit: 1, send: accepted }), deliverAssignmentEmails({ limit: 1, send: accepted })])
  assert.equal(calls, 1); assert.equal(race.reduce((sum, r) => sum + r.sent, 0), 1)
  await deliverAssignmentEmails({ send: accepted }); assert.equal(calls, 1)

  const deferred = await fixture()
  const tick = new Date()
  await db.notificationOutbox.update({ where: { id: deferred.job.id }, data: { availableAt: new Date(tick.getTime() + 5 * 60_000) } })
  assert.equal((await deliverAssignmentEmails({ now: () => tick, send: accepted })).claimed, 0)
  const catchUp = new Date(tick.getTime() + 15 * 60_000)
  assert.equal((await deliverAssignmentEmails({ now: () => catchUp, send: accepted })).sent, 1)
  assert.equal((await deliverAssignmentEmails({ now: () => catchUp, send: accepted })).claimed, 0)

  for (const [code, status, retryable] of [
    ['EMAIL_PROVIDER_UNAVAILABLE', null, true], ['EMAIL_PROVIDER_REJECTED', 503, true],
    ['EMAIL_PROVIDER_REJECTED', 429, true], ['EMAIL_PROVIDER_REJECTED', 422, false],
    ['EMAIL_PROVIDER_RESPONSE_INVALID', null, true],
  ] as const) {
    const f = await fixture()
    const attempt = await deliverAssignmentEmails({ limit: 1, send: async () => { throw new AuthEmailDeliveryError(code, 'not logged', status) } })
    assert.equal(retryable ? attempt.retry : attempt.failed, 1)
    const failed: { lastErrorCode: string | null; attemptCount: number } = await db.notificationOutbox.findUniqueOrThrow({ where: { id: f.job.id } })
    assert.equal(failed.lastErrorCode, code)
    assert.equal(failed.attemptCount, 1)
    assert.equal((await db.providerInvitation.findUniqueOrThrow({ where: { id: f.invitation.id } })).status, 'INVITED')
    assert.equal((await db.assignment.findUniqueOrThrow({ where: { id: f.draft.id } })).status, 'AWAITING_RESPONSES')
    if (retryable) {
      await db.notificationOutbox.update({ where: { id: f.job.id }, data: { availableAt: new Date(0) } })
      const retried = await deliverAssignmentEmails({ limit: 1, send: accepted })
      assert.equal(retried.sent, 1)
    }
  }
  const exhausted = await fixture()
  await db.notificationOutbox.update({ where: { id: exhausted.job.id }, data: { attemptCount: 4 } })
  assert.equal((await deliverAssignmentEmails({ limit: 1, send: async () => { throw new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'ignored') } })).failed, 1)
  const stuck = await fixture()
  await db.notificationOutbox.update({ where: { id: stuck.job.id }, data: { status: 'PROCESSING', leaseToken: randomUUID(), leaseUntil: new Date(0), firstAttemptAt: new Date(Date.now() - 24 * 60 * 60_000), attemptCount: 1 } })
  assert.equal((await deliverAssignmentEmails({ limit: 1, send: accepted })).failed, 1)
  assert.equal((await db.notificationOutbox.findUniqueOrThrow({ where: { id: stuck.job.id } })).lastErrorCode, 'DELIVERY_RECONCILIATION_REQUIRED')
  const optedOut = await fixture()
  await db.user.update({ where: { id: user.id }, data: { assignmentEmailEnabled: false } })
  assert.equal((await deliverAssignmentEmails({ limit: 1, send: accepted })).failed, 1)
  assert.equal((await db.notificationOutbox.findUniqueOrThrow({ where: { id: optedOut.job.id } })).lastErrorCode, 'RECIPIENT_NOT_DELIVERABLE')
  await db.user.update({ where: { id: user.id }, data: { assignmentEmailEnabled: true } })

  await db.marketplaceRuleSet.create({ data: { ...ruleData, participationPriceCredits: 40, version: 'test.notifications.2', validFrom: new Date() } })
  const newer = await fixture()
  assert.equal(newer.invitation.creditCost, 42)
  assert.equal((await getProviderInvitationDetail(user.id, providerOrg.id, initial.invitation.id)).invitation.preview.priceCredits, 27)
  const account = await db.creditAccount.create({ data: { organizationId: providerOrg.id } })
  await db.creditTransaction.create({ data: { creditAccountId: account.id, type: 'ADMIN_GRANT', amount: 100, totalDelta: 100, reservedDelta: 0, balanceAfter: 100, reason: 'Isolated test credits', createdByUserId: user.id, idempotencyKey: randomUUID() } })
  const purchaseInput = { actorUserId: user.id, providerOrganizationId: providerOrg.id, invitationId: initial.invitation.id, idempotencyKey: randomUUID() }
  await Promise.all([acceptProviderInvitation(purchaseInput), acceptProviderInvitation(purchaseInput)])
  await assert.rejects(acceptProviderInvitation({ ...purchaseInput, actorUserId: client.id }))
  const payments = await db.creditTransaction.findMany({ where: { type: 'PARTICIPATION_PAYMENT' } })
  assert.equal(payments.length, 1); assert.equal(payments[0].amount, -27); assert.equal(payments[0].marketplaceRuleSetId, rule.id)
  const price = resolveAssignmentPrice(rule, 'bedrijfsarts', new Date())
  assert.equal(price.resolvedPrice, 27)
  // Actual Simple Advice -> Request -> Assignment -> primary and additional invitations.
  const additionalOrg = await db.organization.create({ data: { name: 'TEST Additional Provider', organizationType: 'PROVIDER', status: 'ACTIVE' } })
  const additionalUser = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true, memberships: { create: { organizationId: additionalOrg.id, status: 'ACTIVE', role: 'OWNER' } } } })
  const additionalProfile = await db.providerProfile.create({ data: { organizationId: additionalOrg.id, lifecycleStatus: 'QUALIFIED', readinessStatus: 'READY', platformQualificationStatus: 'QUALIFIED', selectabilityStatus: 'SELECTABLE' } })
  const additionalReadiness = await db.providerReadinessAssessment.create({ data: { providerProfileId: additionalProfile.id, status: 'READY', reasonCodes: [], sourceVersion: 1, checksum: 'd'.repeat(64) } })
  const additionalSelectability = await db.providerSelectabilityAssessment.create({ data: { providerProfileId: additionalProfile.id, readinessAssessmentId: additionalReadiness.id, status: 'SELECTABLE', reasonCodes: [], sourceVersion: 1, checksum: 'e'.repeat(64) } })
  await db.trustedProviderProjection.create({ data: { providerProfileId: additionalProfile.id, readinessAssessmentId: additionalReadiness.id, selectabilityAssessmentId: additionalSelectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1, payload: { capabilities: [{ serviceCode: 'ABSENCE_REINTEGRATION', specialismCode: 'casemanager-verzuim', deliveryModes: ['ON_SITE', 'REMOTE'] }], sectors: [], workAreas: [{ regionCode: 'NATIONWIDE' }] }, sha256: 'f'.repeat(64), validFrom: new Date(Date.now() - 60_000), validUntil: new Date(Date.now() + 7 * 86_400_000) } })
  const { publishSimpleAdviceRequest } = await import('../src/lib/requests/simple-advice-service')
  const viewer = { userId: client.id, organizationId: clientOrg.id, organizationRole: 'OWNER' as const, isPlatformAdministrator: false }
  const basic = { routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'BEDRIJFSARTS', additionalExpertises: ['CASEMANAGER_VERZUIM'], requestTitle: 'Fictieve vertrouwelijke klantnaam', requestDescription: 'Wij willen advies over gezondheid op het werk.', desiredOutcome: 'ADVICE', workLocationMode: 'REMOTE', desiredStartMode: 'WITHIN_ONE_MONTH' }
  const published = await publishSimpleAdviceRequest(viewer, randomUUID(), basic)
  const matched = await runMarketplaceMatching({ actorUserId: client.id, organizationId: clientOrg.id, assignmentId: published.id, expectedAssignmentVersion: 1, idempotencyKey: randomUUID() })
  assert.equal(matched.invitations.length, 2)
  const additionalInvitation = matched.invitations.find(inv => inv.providerProfileId === additionalProfile.id)!
  const primaryInvitation = matched.invitations.find(inv => inv.providerProfileId === profile.id)!
  assert.equal((additionalInvitation.snapshot as { matchType: string }).matchType, 'ADDITIONAL')
  assert.equal((primaryInvitation.snapshot as { matchType: string }).matchType, 'PRIMARY')
  assert.equal(additionalInvitation.creditCost, primaryInvitation.creditCost)
  const additionalDetail = await getProviderInvitationDetail(additionalUser.id, additionalOrg.id, additionalInvitation.id)
  assert.deepEqual(additionalDetail.invitation.preview.additionalExpertises, ['Casemanager verzuim'])
  assert.equal(additionalDetail.invitation.preview.expertise, 'Bedrijfsarts')
  assert.equal(additionalDetail.invitation.preview.assignmentId, published.id)
  const delivered: AuthEmail[] = []
  await deliverAssignmentEmails({ send: async email => { delivered.push(email); return { accepted: true, status: 'ACCEPTED', transport: 'RESEND', messageId: randomUUID() } } })
  assert.ok(delivered.some(email => email.subject === 'Nieuwe opdracht mogelijk relevant voor Casemanager verzuim | WorkMatchr'))
  assert.ok(delivered.some(email => email.subject === 'Nieuwe opdracht voor Bedrijfsarts | WorkMatchr'))
  for (const [invitation, recipient] of [[primaryInvitation, user], [additionalInvitation, additionalUser]] as const) {
    const mails = delivered.filter(email => email.html.includes(`/uitnodigingen/${invitation.id}`))
    assert.equal(mails.length, 1)
    assert.equal(mails[0].to, recipient.email)
    assert.ok(mails[0].html.includes(`${invitation.creditCost} credits`))
    assert.equal(mails[0].html.includes(basic.requestTitle), false)
    assert.equal(await db.notificationOutbox.count({ where: { eventId: `INVITATION:${invitation.id}`, recipientUserId: recipient.id, status: 'SENT' } }), 1)
  }
  assert.equal((await deliverAssignmentEmails({ send: async () => { throw new Error('Duplicate delivery') } })).claimed, 0)
  const beforeUnknown = await db.providerInvitation.count()
  const unknown = await publishSimpleAdviceRequest(viewer, randomUUID(), { ...basic, routeChoice: 'NEEDS_TOPIC', requestedExpertise: null, additionalExpertises: [], helpTopic: 'UNKNOWN' })
  await assert.rejects(runMarketplaceMatching({ actorUserId: client.id, organizationId: clientOrg.id, assignmentId: unknown.id, expectedAssignmentVersion: 1, idempotencyKey: randomUUID() }))
  assert.equal(await db.providerInvitation.count(), beforeUnknown)

  if (process.env.WM_NOTIFICATION_BROWSER_ACCEPTANCE === '1') {
    const { hashPassword } = await import('better-auth/crypto')
    const { mkdir, writeFile } = await import('node:fs/promises')
    const { randomBytes } = await import('node:crypto')
    const platform = await db.organization.create({ data: { name: 'TEST Platform', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE' } })
    const administrator = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, platformRole: 'ADMIN', status: 'ACTIVE', emailVerified: true, accountType: 'CLIENT', memberships: { create: { organizationId: platform.id, role: 'OWNER', status: 'ACTIVE' } } } })
    const password = randomBytes(24).toString('base64url')
    const hash = await hashPassword(password)
    for (const actor of [user, additionalUser, administrator]) await db.account.create({ data: { userId: actor.id, providerId: 'credential', accountId: actor.id, password: hash } })
    await mkdir('.local-storage/notification-acceptance/emails', { recursive: true })
    await writeFile('.local-storage/notification-acceptance/fixture.json', JSON.stringify({ databaseName, primaryInvitationId: primaryInvitation.id, additionalInvitationId: additionalInvitation.id, providerEmail: user.email, additionalEmail: additionalUser.email, administratorEmail: administrator.email, password }), 'utf8')
    for (const type of ['primary', 'additional']) {
      const invitationId = type === 'additional' ? additionalInvitation.id : primaryInvitation.id
      const mail = delivered.find(email => email.html.includes(`/uitnodigingen/${invitationId}`))!
      await writeFile(`.local-storage/notification-acceptance/emails/${type}.html`, mail.html, 'utf8')
    }
    keepDatabase = true
    console.log('LOCAL_BROWSER_FIXTURES_READY')
  }
  console.log(`PASS: ${fixtureNumber} matching fixtures; pricing snapshot/purchase/privacy/deduplication/concurrent worker/retry/failure/preference/tenant checks`)
} finally {
  await db?.$disconnect()
  if (!keepDatabase) await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
  else console.log('Temporary acceptance database retained for browser checks; explicit cleanup required.')
  await admin.end()
}
