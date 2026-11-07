import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import type { PrismaClient } from '../src/generated/prisma/client'
import { createOrganization } from '../src/lib/organizations/organization-service'
import { createOrganizationSchema } from '../src/lib/organizations/organization-validation'
import { assessProviderDossierCompleteness } from '../src/lib/providers/provider-dossier-completeness'
import { blockedOnboardingProfiles } from '../src/lib/providers/provider-marketplace-onboarding'
import { requireProviderMarketplaceAccess, requireProviderParticipationAccess } from '../src/lib/marketplace/marketplace-authorization'
import { acceptProviderInvitation } from '../src/lib/marketplace/participation-service'
import { saveQuoteDraft, submitQuote } from '../src/lib/marketplace/quote-service'
import { registerRequestInterest } from '../src/lib/requests/request-interest-service'
import { claimRequestOfferSlot } from '../src/lib/requests/request-offer-slot-service'
import { appendAccountProvisioningEvent } from '../src/lib/account-architecture/account-history-service'
import { professionalOnboarding } from '../src/lib/providers/provider-onboarding-cohort'

// Invoked exclusively from the empty, loopback-only B4 database harness.
export async function verifyProviderMarketplaceOnboarding(db: PrismaClient, fixture: {
  reviewedByUserId: string; approvedByUserId: string; reasonCode: string
  sectorTermId: string; serviceTermId: string; regionTermId: string; insuranceTermId: string; qualificationTermId: string
  legacyOrganizationId: string; legacyProfileId: string; legacyOwnerId: string; legacyMemberId: string
}) {
  const user = await db.user.create({ data: { email: 'b4-onboarding@example.invalid', accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
  const sector = await db.sector.create({ data: { name: 'Testsector B4', slug: 'testsector-b4' } })
  await db.providerSectorTaxonomyMap.create({ data: { sectorId: sector.id, termId: fixture.sectorTermId } })
  const org = await createOrganization(user.id, createOrganizationSchema.parse({
    name: 'Testorganisatie B4', chamberOfCommerceNumber: '00000001', organizationType: 'PROVIDER', sectorIds: [sector.id],
    addressLine: 'Teststraat 1', postalCode: '0000 AA', city: 'Teststad', countryCode: 'NL', acceptedBusinessAccuracy: 'on',
  }))
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { organizationId: org.id } })
  const providerProfileId = profile.id
  const candidate = { providerProfileId, organizationId: org.id }
  const legacy = { providerProfileId: fixture.legacyProfileId, organizationId: fixture.legacyOrganizationId }
  const matching = (userId?: string) => db.$transaction(tx => blockedOnboardingProfiles(tx, [candidate, legacy], new Date(), userId))
  const participate = (actorId = user.id, orgId = org.id) => db.$transaction(tx => requireProviderParticipationAccess(tx, actorId, orgId))
  const denied = { code: 'PROFILE_ONBOARDING_REQUIRED' }
  const assess = () => assessProviderDossierCompleteness(user.id, providerProfileId)
  assert.equal((await assess()).policyVersion, 'PROVIDER-COMPLETENESS-B4-2')
  assert.deepEqual(await matching(), new Set([providerProfileId]))
  assert.equal((await participate(fixture.legacyOwnerId, fixture.legacyOrganizationId)).role, 'OWNER')
  await assert.rejects(participate(fixture.legacyMemberId, fixture.legacyOrganizationId), { code: 'ACCESS_DENIED' })
  await assert.rejects(participate(user.id, fixture.legacyOrganizationId), { code: 'ACCESS_DENIED' })
  assert.equal((await db.$transaction(tx => requireProviderMarketplaceAccess(tx, user.id, org.id))).role, 'OWNER')

  // Simulate the immutable invitation event on a pre-B4 tenant. It affects only its subject.
  await appendAccountProvisioningEvent(db, {
    eventType: 'ORGANIZATION_LINKED', subjectUserId: fixture.legacyMemberId, organizationId: fixture.legacyOrganizationId,
    reasonCode: 'ORGANIZATION_INVITATION_LINKED', metadata: { marketplaceOnboarding: professionalOnboarding },
  })
  assert.deepEqual(await matching(fixture.legacyMemberId), new Set([providerProfileId, legacy.providerProfileId]))
  assert.deepEqual(await matching(fixture.legacyOwnerId), new Set([providerProfileId]))
  assert.deepEqual(await matching(), new Set([providerProfileId]))

  const actor = { userId: user.id, organizationId: org.id }
  const operator = { actorUserId: user.id, providerOrganizationId: org.id }
  const id = randomUUID()
  await assert.rejects(acceptProviderInvitation({ ...operator, invitationId: id, idempotencyKey: id }), denied)
  await assert.rejects(saveQuoteDraft({ ...operator, participationId: id, expectedQuoteVersion: 1,
    content: { priceCents: 100, priceExplanation: 'Testtoelichting', approach: 'Dit is een synthetische testaanpak.', planning: 'Planning voor de test' } }), denied)
  await assert.rejects(submitQuote({ ...operator, quoteId: id, expectedQuoteVersion: 1, idempotencyKey: id }), denied)
  await assert.rejects(registerRequestInterest({ actor, requestId: id }), { code: 'ACCESS_DENIED' })
  await assert.rejects(claimRequestOfferSlot({ actor, requestId: id }), { code: 'ACCESS_DENIED' })
  assert.equal(await db.quote.count(), 0)
  assert.equal(await db.providerParticipation.count(), 0)

  const checksum = createHash('sha256').update('B4 synthetic fixture').digest('hex')
  const past = new Date('2020-01-01'), future = new Date('2090-01-01')
  const service = await db.providerCapability.create({ data: { providerProfileId, revisions: { create: { version: 1,
    serviceTermId: fixture.serviceTermId, deliveryModes: ['REMOTE'] } } } })
  await db.providerSectorExperience.create({ data: { providerProfileId, revisions: { create: { version: 1, sectorTermId: fixture.sectorTermId } } } })
  await db.providerWorkArea.create({ data: { providerProfileId, revisions: { create: { version: 1, regionTermId: fixture.regionTermId } } } })
  // Matching essentials are enough for new providers; no insurance, evidence,
  // professional roster or separate declarations are needed for onboarding.
  assert.equal((await assess()).completed, 4)
  assert.deepEqual((await assess()).blockingSections, [])

  await assert.rejects(participate(), denied)
  await db.providerProfile.update({ where: { id: providerProfileId }, data: {
    lifecycleStatus: 'QUALIFIED', approvalStatus: 'APPROVED', platformQualificationStatus: 'QUALIFIED', readinessStatus: 'READY', selectabilityStatus: 'SELECTABLE',
  } })
  await assert.rejects(participate(), denied)
  const readiness = await db.providerReadinessAssessment.create({ data: { providerProfileId, status: 'READY', sourceVersion: profile.version, reasonCodes: [], checksum } })
  const selectability = await db.providerSelectabilityAssessment.create({ data: { providerProfileId, readinessAssessmentId: readiness.id,
    status: 'SELECTABLE', sourceVersion: profile.version, reasonCodes: [], checksum } })
  await db.trustedProviderProjection.create({ data: { providerProfileId, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id,
    schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: profile.version, payload: { synthetic: true }, sha256: checksum, validFrom: past, validUntil: future } })
  await assert.rejects(participate(), denied)
  const history = { providerProfileId, outcome: 'QUALIFIED' as const, validFrom: past, sourceChecksum: checksum,
    reviewedByUserId: fixture.reviewedByUserId, approvedByUserId: fixture.approvedByUserId, reasonCode: fixture.reasonCode }
  await db.providerQualificationDecision.createMany({ data: [
    { ...history, scope: 'PLATFORM' }, { ...history, scope: 'CAPABILITY', capabilityId: service.id },
  ] })
  assert.equal((await participate()).providerProfile.id, providerProfileId)
  assert.deepEqual(await matching(), new Set())
  // A later change invalidates the approval for the previous profile version.
  await db.providerProfile.update({ where: { id: providerProfileId }, data: { version: { increment: 1 } } })
  await assert.rejects(participate(), denied)
  assert.deepEqual(await matching(), new Set([providerProfileId]))
  console.log('PASS onboarding, 4/4 matching sections, separate approval, stale approval, actions, legacy cohort and tenant isolation')
}
