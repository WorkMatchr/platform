import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import type { PrismaClient } from '../../src/generated/prisma/client'
import {
  createProviderDossierSubmission, finalizeProviderDossierReview, openProviderDossierReviewCase,
} from '../../src/lib/providers/provider-dossier-service'

// Downstream notification and concurrency tests start with an already reviewed supplier.
// The separate onboarding suite exercises qualification issuance and substantive requirements.
export async function prepareReviewedSupplier(db: PrismaClient, profileId: string, organizationId: string) {
  const url = new URL(process.env.DATABASE_URL!)
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  const [identity] = await db.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`
  assert.equal('/' + identity.database, url.pathname)
  assert.match(identity.database, /^workmatchr_(marketplace_concurrency|notifications_test|test_providers_m7d[23])_\d+_\d+$/)

  const owner = await db.organizationMembership.findFirstOrThrow({ where: { organizationId, role: 'OWNER', status: 'ACTIVE' } })
  const platform = await db.organization.upsert({ where: { systemKey: 'WORKMATCHR_PLATFORM' }, update: {},
    create: { systemKey: 'WORKMATCHR_PLATFORM', name: 'Testplatform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE' } })
  const reasonCode = 'TEST_FIXTURE_REVIEW'
  await db.providerReasonCode.upsert({ where: { code: reasonCode }, update: {},
    create: { code: reasonCode, domain: 'QUALIFICATION', label: 'Synthetische dossierbeoordeling' } })
  async function operator(permission: 'PROVIDER_REVIEWER' | 'PROVIDER_APPROVER') {
    const user = await db.user.create({ data: { email: randomUUID() + '@example.invalid', status: 'ACTIVE', platformRole: 'ADMIN',
      memberships: { create: { organizationId: platform.id, role: 'ADMIN', status: 'ACTIVE' } } } })
    await db.providerPlatformPermissionGrant.create({ data: { userId: user.id, grantedByUserId: user.id, permission, validFrom: new Date(), reasonCode } })
    return user.id
  }
  const reviewer = await operator('PROVIDER_REVIEWER')
  const approver = await operator('PROVIDER_APPROVER')
  async function term(kind: 'SECTOR' | 'REGION' | 'SERVICE') {
    const existing = await db.providerTaxonomyTerm.findFirst({ where: { isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind } } } })
    if (existing) return existing.id
    const taxonomy = await db.providerTaxonomy.upsert({ where: { kind }, update: {}, create: { kind, code: kind, name: kind } })
    const version = await db.providerTaxonomyVersion.create({ data: { taxonomyId: taxonomy.id, version: 1,
      status: 'PUBLISHED', publishedAt: new Date(), checksum: createHash('sha256').update(kind).digest('hex') } })
    return (await db.providerTaxonomyTerm.create({ data: { versionId: version.id, code: kind, label: kind, sortOrder: 1 } })).id
  }
  let capabilities = await db.providerCapability.findMany({ where: { providerProfileId: profileId, status: 'ACTIVE' }, select: { id: true } })
  if (!capabilities.length) {
    const sectorTermId = await term('SECTOR'), regionTermId = await term('REGION'), serviceTermId = await term('SERVICE')
    await db.organization.update({ where: { id: organizationId }, data: { chamberOfCommerceNumber: String(parseInt(randomUUID().slice(0, 7), 16)).slice(-8).padStart(8, '0') } })
    await db.providerSectorExperience.create({ data: { providerProfileId: profileId, revisions: { create: { version: 1, sectorTermId } } } })
    await db.providerWorkArea.create({ data: { providerProfileId: profileId, revisions: { create: { version: 1, regionTermId } } } })
    const capability = await db.providerCapability.create({ data: { providerProfileId: profileId,
      revisions: { create: { version: 1, serviceTermId, deliveryModes: ['ON_SITE', 'REMOTE'] } } } })
    capabilities = [capability]
  }
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: profileId } })
  const submission = await createProviderDossierSubmission(owner.userId, profileId, { expectedProfileVersion: profile.version, idempotencyKey: randomUUID() })
  const review = await openProviderDossierReviewCase(reviewer, profileId, { submissionId: submission.id, expectedVersion: 1 })
  await finalizeProviderDossierReview(approver, profileId, 'APPROVED', {
    submissionId: submission.id, reviewCaseId: review.id, expectedVersion: 2, reviewedByUserId: reviewer, reasonCode,
  })
  const snapshot = await db.providerDossierCandidate.findUniqueOrThrow({ where: { id: submission.currentCandidateId! } })
  const decision = { providerProfileId: profileId, reviewedByUserId: reviewer, approvedByUserId: approver, reasonCode,
    outcome: 'QUALIFIED' as const, validFrom: new Date(), dossierCandidateId: snapshot.id,
    dossierSubmissionId: submission.id, dossierReviewCaseId: review.id, sourceChecksum: snapshot.sha256 }
  const [, current] = await db.$transaction([
    db.providerQualificationDecision.createMany({ data: [{ ...decision, scope: 'PLATFORM' },
      ...capabilities.map(cap => ({ ...decision, scope: 'CAPABILITY' as const, capabilityId: cap.id }))] }),
    db.providerProfile.update({ where: { id: profileId }, data: { version: { increment: 1 + capabilities.length } } }),
  ])
  return current.version
}

// Refresh only the originally selectable test cohort. Preserve its original regional payload.
export async function reviewSelectableRequestFixtures(db: PrismaClient) {
  const profiles = await db.providerProfile.findMany({ where: { selectabilityStatus: 'SELECTABLE' },
    include: { trustedProjections: { take: 1, orderBy: { sourceVersion: 'desc' } } } })
  for (const profile of profiles) {
    const [existing] = profile.trustedProjections
    assert.ok(existing && existing.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload))
    const sourceVersion = await prepareReviewedSupplier(db, profile.id, profile.organizationId)
    const payload = { ...existing.payload, sourceVersion }
    const sha256 = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    const readiness = await db.providerReadinessAssessment.create({ data: { providerProfileId: profile.id, status: 'READY', sourceVersion, reasonCodes: [], checksum: sha256 } })
    const selectability = await db.providerSelectabilityAssessment.create({ data: { providerProfileId: profile.id,
      readinessAssessmentId: readiness.id, status: 'SELECTABLE', sourceVersion, reasonCodes: [], checksum: sha256 } })
    await db.trustedProviderProjection.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id,
      selectabilityAssessmentId: selectability.id, schemaVersion: existing.schemaVersion, canonicalizationVersion: existing.canonicalizationVersion,
      sourceVersion, payload, sha256, validFrom: new Date(), validUntil: existing.validUntil } })
  }
}
