import { calculateProviderSelectability } from '../src/lib/providers/provider-assessment-service'
import { createTrustedProviderProjection } from '../src/lib/providers/trusted-provider-projection-service'
import { currentMarketplaceProjections } from '../src/lib/providers/provider-marketplace-onboarding'
import { requireProviderParticipationAccess } from '../src/lib/marketplace/marketplace-authorization'
import { getProviderInvitationDetail } from '../src/lib/marketplace/dashboard-query-service'
import assert from 'node:assert/strict'
import type { PrismaClient, ProviderQualificationOutcome } from '../src/generated/prisma/client'
import { recordProviderQualificationDecision } from '../src/lib/providers/provider-qualification-service'

// Called only by the empty loopback database harness, after the reference catalogue exists.
export async function verifyProviderQualification(db: PrismaClient, serviceTermId: string, requirementTermId: string, regionTermId: string) {
  const past = new Date('2020-01-01'), future = new Date('2090-01-01'), checksum = 'e'.repeat(64)
  const platform = await db.organization.create({ data: {
    name: 'Test kwalificatiebeheer', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM',
  } })
  async function operator(name: string) {
    return db.user.create({ data: { email: name + '@example.invalid', status: 'ACTIVE', platformRole: 'ADMIN',
      memberships: { create: { organizationId: platform.id, role: 'ADMIN', status: 'ACTIVE' } } } })
  }
  const reviewer = await operator('b4-test-reviewer'), approver = await operator('b4-test-approver')
  const reasonCode = 'TEST_QUALIFICATION'
  await db.providerReasonCode.create({ data: { code: reasonCode, domain: 'QUALIFICATION', label: 'Synthetische test' } })
  for (const [actor, permission] of [[reviewer, 'PROVIDER_REVIEWER'], [approver, 'PROVIDER_APPROVER']] as const) {
    await db.providerPlatformPermissionGrant.create({ data: { permission, userId: actor.id, grantedByUserId: approver.id, validFrom: past, reasonCode } })
  }
  async function subject(name: string) {
    const org = await db.organization.create({ data: { name, organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const profile = await db.providerProfile.create({ data: { organizationId: org.id, lifecycleStatus: 'QUALIFIED', platformQualificationStatus: 'QUALIFIED', readinessStatus: 'READY', selectabilityStatus: 'SELECTABLE' } })
    const cap = await db.providerCapability.create({ data: { providerProfileId: profile.id, revisions: { create: { version: 1, deliveryModes: ['REMOTE'], serviceTermId } } }, include: { revisions: true } })
    await db.providerVerificationReview.create({ data: { providerProfileId: profile.id, capabilityRevisionId: cap.revisions[0].id,
      outcome: 'VERIFIED', resultingLevel: 'VERIFIED', reviewerUserId: reviewer.id, reasonCode, validFrom: past, checksum } })
    const readiness = await db.providerReadinessAssessment.create({ data: { providerProfileId: profile.id, status: 'READY', sourceVersion: 1, reasonCodes: [], checksum } })
    const selectability = await db.providerSelectabilityAssessment.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, status: 'SELECTABLE', sourceVersion: 1, reasonCodes: [], checksum } })
    await db.trustedProviderProjection.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1, payload: {}, sha256: checksum, validFrom: past, validUntil: future } })
    return { org, profile, cap }
  }
  const a = await subject('Test kwalificatie A'), b = await subject('Test kwalificatie B')
  const config = await db.providerCapabilityRequirementConfig.create({ data: { version: 1, effectiveFrom: past } })
  await db.providerCapabilityQualificationRequirement.create({ data: { configId: config.id, serviceTermId, requirementTermId, kind: 'QUALIFICATION', minimumVerification: 'SELF_DECLARED', isRequired: true } })
  await db.providerCapabilityRequirementConfig.update({ where: { id: config.id }, data: { status: 'PUBLISHED', checksum, publishedAt: past } })
  await db.providerOrganizationQualification.create({ data: { providerProfileId: a.profile.id, revisions: { create: { version: 1, qualificationTermId: requirementTermId } } } })
  const state = () => db.providerProfile.findMany({
    where: { id: { in: [a.profile.id, b.profile.id] } }, orderBy: { id: 'asc' },
    include: { qualificationDecisions: true, readinessAssessments: true, selectabilityAssessments: true, blocks: true,
      trustedProjections: { include: { invalidation: true } } },
  })
  const before = await state()
  const outcomes = ['QUALIFIED', 'SUSPENDED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED', 'RESTORED'] as const
  let version = a.profile.version
  const decide = (outcome: ProviderQualificationOutcome, capabilityId = a.cap.id, actor = approver.id) =>
    recordProviderQualificationDecision(actor, a.profile.id, { expectedProfileVersion: version, scope: 'CAPABILITY', capabilityId, outcome, reviewedByUserId: reviewer.id, reasonCode })
  for (const outcome of outcomes) {
    await assert.rejects(decide(outcome, b.cap.id), { code: 'NOT_FOUND' })
    assert.deepEqual(await state(), before)
  }
  await assert.rejects(decide('SUSPENDED', a.cap.id, reviewer.id), { code: 'FOUR_EYES_REQUIRED' })
  for (const outcome of outcomes) {
    const decision = await decide(outcome)
    assert.equal(decision.outcome, outcome)
    assert.equal(decision.profileVersion, ++version)
  }
  assert.equal(await db.providerQualificationDecision.count({ where: { providerProfileId: a.profile.id } }), 6)
  assert.deepEqual((await state()).find(row => row.id === b.profile.id), before.find(row => row.id === b.profile.id))
  await db.providerCapability.update({ where: { id: a.cap.id }, data: { status: 'ARCHIVED' } })
  await assert.rejects(decide('RESTORED'), { code: 'CONFIGURATION_INCOMPLETE' })
  assert.equal((await decide('SUSPENDED')).profileVersion, ++version)
  console.log('PASS ownership: 6 foreign decisions refused without side effects; 6 authorized decisions; four eyes; archived capability')

  const c = await subject('Test chronologische kwalificatie')
  const providerProfileId = c.profile.id
  const candidate = { providerProfileId, organizationId: c.org.id }
  const owner = await db.user.create({ data: { email: 'b4-chronologie@example.invalid', status: 'ACTIVE', accountType: 'PROFESSIONAL',
    memberships: { create: { organizationId: c.org.id, role: 'OWNER', status: 'ACTIVE' } } } })
  const access = () => db.$transaction(tx => requireProviderParticipationAccess(tx, owner.id, c.org.id))
  const history = { providerProfileId, reviewedByUserId: reviewer.id, approvedByUserId: approver.id, reasonCode, sourceChecksum: checksum }
  await db.providerOrganizationQualification.create({ data: { providerProfileId, revisions: { create: { version: 1, qualificationTermId: requirementTermId } } } })
  const second = await db.providerCapability.create({ data: { providerProfileId, revisions: { create: { version: 1, serviceTermId, deliveryModes: ['REMOTE'] } } } })
  const area = await db.providerWorkArea.create({ data: { providerProfileId, revisions: { create: { version: 1, regionTermId } } }, include: { revisions: true } })
  await db.providerVerificationReview.create({ data: { providerProfileId, workAreaRevisionId: area.revisions[0].id, reviewerUserId: reviewer.id, validFrom: past, reasonCode, checksum, outcome: 'VERIFIED', resultingLevel: 'VERIFIED' } })
  await db.providerQualificationDecision.createMany({ data: [
    { ...history, scope: 'PLATFORM', outcome: 'QUALIFIED', validFrom: past },
    { ...history, scope: 'CAPABILITY', capabilityId: second.id, outcome: 'QUALIFIED', validFrom: past },
  ] })
  async function change(outcome: ProviderQualificationOutcome, platform = false, actor = approver.id) {
    const { version } = await db.providerProfile.findUniqueOrThrow({ where: { id: providerProfileId } })
    return recordProviderQualificationDecision(actor, providerProfileId, { expectedProfileVersion: version, scope: platform ? 'PLATFORM' : 'CAPABILITY',
      capabilityId: platform ? undefined : c.cap.id, outcome, reviewedByUserId: reviewer.id, reasonCode })
  }
  // Independent dossier requirements are a known-good input to this selectability test.
  async function ready() {
    const row = await db.providerProfile.update({ where: { id: providerProfileId }, data: { readinessStatus: 'READY' } })
    await db.providerReadinessAssessment.create({ data: { providerProfileId, sourceVersion: row.version, status: 'READY', reasonCodes: [], checksum } })
  }
  async function selectable() {
    await ready()
    assert.equal((await calculateProviderSelectability(providerProfileId)).status, 'SELECTABLE')
  }
  const project = () => createTrustedProviderProjection(providerProfileId)
  async function blocked() {
    await assert.rejects(access(), { code: 'PROFILE_ONBOARDING_REQUIRED' })
    await assert.rejects(getProviderInvitationDetail(owner.id, c.org.id, c.cap.id), { code: 'PROFILE_ONBOARDING_REQUIRED' })
    await assert.rejects(project(), { code: 'PROJECTION_NOT_ALLOWED' })
  }
  await change('QUALIFIED')
  await selectable()
  const original = await project()
  assert.equal((await access()).projectionId, original.id)
  await change('SUSPENDED')
  assert.ok(await db.trustedProviderProjectionInvalidation.findUnique({ where: { projectionId: original.id } }))
  await ready()
  assert.equal((await calculateProviderSelectability(providerProfileId)).status, 'NOT_SELECTABLE')
  await blocked()
  await assert.rejects(change('QUALIFIED'), { code: 'CONFLICT' })
  await assert.rejects(change('RESTORED', false, reviewer.id), { code: 'FOUR_EYES_REQUIRED' })
  await assert.rejects(change('RESTORED', false, owner.id), { code: 'ACCESS_DENIED' })
  await change('RESTORED')
  await selectable()
  const restored = await project()
  assert.notEqual(restored.id, original.id)
  assert.equal((await access()).projectionId, restored.id)
  assert.equal((await db.$transaction(tx => currentMarketplaceProjections(tx, [{ ...candidate, projectionId: original.id }], new Date()))).size, 0)

  // Race first issuance for a fresh revision, not just reuse of an existing projection.
  await change('QUALIFIED')
  await selectable()
  const race = await Promise.allSettled([change('SUSPENDED'), calculateProviderSelectability(providerProfileId), project()])
  if (race[0].status === 'rejected') {
    assert.equal(race[0].reason.code, 'P2034')
    await change('SUSPENDED')
  }
  for (const attempt of race.slice(1)) {
    if (attempt.status === 'rejected') assert.ok(['P2034', 'PROJECTION_NOT_ALLOWED'].includes(attempt.reason.code))
  }
  assert.equal(await db.trustedProviderProjection.count({ where: { providerProfileId, invalidation: null } }), 0)
  await ready()
  assert.equal((await calculateProviderSelectability(providerProfileId)).status, 'NOT_SELECTABLE')
  await blocked()

  // Pre-existing and scheduled rows use the same PostgreSQL ordering at every read boundary.
  const start = new Date(Date.now() + 86_400_000)
  const end = new Date(+start + 3600_000)
  const futureRecord = { ...history, scope: 'CAPABILITY' as const, capabilityId: c.cap.id }
  await db.providerQualificationDecision.create({ data: { ...futureRecord, outcome: 'RESTORED', validFrom: start, validUntil: end } })
  assert.equal((await calculateProviderSelectability(providerProfileId)).status, 'NOT_SELECTABLE')
  await blocked()
  assert.equal((await calculateProviderSelectability(providerProfileId, start)).status, 'SELECTABLE')
  assert.equal((await calculateProviderSelectability(providerProfileId, end)).status, 'NOT_SELECTABLE')
  const same = new Date(+end + 3600_000)
  await db.providerQualificationDecision.createMany({ data: [
    { ...futureRecord, outcome: 'QUALIFIED', validFrom: same },
    { ...futureRecord, outcome: 'SUSPENDED', validFrom: same },
  ] })
  assert.equal((await calculateProviderSelectability(providerProfileId, same)).status, 'NOT_SELECTABLE')
  await change('RESTORED')
  await selectable()
  const bounded = await project()
  assert.equal(+(await db.trustedProviderProjection.findUniqueOrThrow({ where: { id: bounded.id } })).validUntil, +start)
  // Both boundaries occur while all other scopes are still positive.
  const renewal = new Date(+start - 4 * 3600_000)
  const expires = new Date(+start - 3 * 3600_000)
  const ambiguous = new Date(+start - 2 * 3600_000)
  const secondScope = { ...history, scope: 'CAPABILITY' as const, capabilityId: second.id, outcome: 'QUALIFIED' as const }
  await db.providerQualificationDecision.createMany({ data: [
    { ...secondScope, validFrom: renewal, validUntil: expires },
    { ...secondScope, validFrom: ambiguous }, { ...secondScope, validFrom: ambiguous },
  ] })
  assert.equal((await calculateProviderSelectability(providerProfileId, renewal)).status, 'SELECTABLE')
  // Live reads must deny even when cached selectability and projection still look positive.
  for (const at of [expires, ambiguous]) {
    assert.equal((await db.$transaction(tx => currentMarketplaceProjections(tx, [candidate], at))).size, 0)
    assert.equal((await calculateProviderSelectability(providerProfileId, at)).status, 'NOT_SELECTABLE')
  }
  // A newer expired positive can never expose the older unbounded positive.
  await db.providerQualificationDecision.create({ data: { ...history, scope: 'CAPABILITY', capabilityId: second.id, outcome: 'QUALIFIED', validFrom: start, validUntil: end } })
  assert.equal((await calculateProviderSelectability(providerProfileId, end)).status, 'NOT_SELECTABLE')
  await change('SUSPENDED', true)
  await ready()
  assert.equal((await calculateProviderSelectability(providerProfileId)).status, 'NOT_SELECTABLE')
  await blocked()
  console.log('PASS suspension, two services, stale projection, direct access, four eyes, restore, future boundary, expiry, ambiguity, concurrent recalculation and platform suspension')
  return { reviewedByUserId: reviewer.id, approvedByUserId: approver.id, reasonCode }
}
