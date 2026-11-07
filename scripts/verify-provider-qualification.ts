import assert from 'node:assert/strict'
import type { PrismaClient, ProviderQualificationOutcome } from '../src/generated/prisma/client'
import { recordProviderQualificationDecision } from '../src/lib/providers/provider-qualification-service'

// Called only by the empty loopback database harness, after the reference catalogue exists.
export async function verifyProviderQualification(db: PrismaClient, serviceTermId: string, requirementTermId: string) {
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
}
