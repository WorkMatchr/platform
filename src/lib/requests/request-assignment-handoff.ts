import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { hashProviderJson, type CanonicalValue } from '@/lib/providers/provider-canonical-json'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { writeMarketplaceAudit } from '@/lib/marketplace/marketplace-events'
import { expertiseSpecialismSlugs } from './expertise-specialism-reference'
import { simpleAdviceSchema, usesLocation } from './simple-advice-contract'
import { responseDeadline, RESPONSE_DEADLINE_POLICY } from './response-deadline-policy'

export class RequestHandoffError extends Error {
  constructor(public readonly code: 'NOT_ELIGIBLE' | 'ACCESS_DENIED' | 'INTEGRITY_ERROR' | 'REFERENCE_MISSING') {
    super(code)
  }
}

type HandoffInput = {
  legacyIntakeId?: string
  requestId: string; organizationId: string; actorUserId: string
  sourceVersionId: string; at: Date; mode: 'PUBLICATION' | 'RECOVERY'
}

type SpecialismReference = {
  expertiseId: string
  specialismId: string
  capabilityCode: string
  termId: string
  taxonomyVersionId: string
  tier: 'PRIMARY' | 'ADDITIONAL'
}

/** Prisma interactive transactions use one pg client; never overlap queries on it. */
export async function resolveHandoffSpecialismReferences(
  transaction: Prisma.TransactionClient,
  identities: readonly (keyof typeof expertiseSpecialismSlugs)[],
): Promise<SpecialismReference[]> {
  const references: SpecialismReference[] = []
  for (const [position, code] of identities.entries()) {
    const specialism = await transaction.specialism.findFirst({ where: { slug: expertiseSpecialismSlugs[code], isActive: true } })
    const mapping = specialism ? await transaction.providerSpecialismTaxonomyMap.findUnique({ where: { specialismId: specialism.id } }) : null
    const term = mapping ? await transaction.providerTaxonomyTerm.findUnique({ where: { id: mapping.termId } }) : null
    const version = term ? await transaction.providerTaxonomyVersion.findUnique({ where: { id: term.versionId } }) : null
    if (!specialism || !term?.isActive || version?.status !== 'PUBLISHED') throw new RequestHandoffError('REFERENCE_MISSING')
    references.push({ expertiseId: code, specialismId: specialism.id, capabilityCode: term.code, termId: term.id,
      taxonomyVersionId: term.versionId, tier: position === 0 ? 'PRIMARY' : 'ADDITIONAL' })
  }
  return references
}

/** Nested create-many expansion can overlap queries on Prisma's single transaction client. */
export async function createHandoffAssignmentSpecialisms(
  transaction: Prisma.TransactionClient,
  assignmentId: string,
  references: readonly SpecialismReference[],
) {
  for (const reference of references) {
    await transaction.assignmentSpecialism.create({ data: {
      assignmentId,
      specialismId: reference.specialismId,
      isRequired: reference.tier === 'PRIMARY',
    } })
  }
}

/** Called only within the publication/recovery Serializable transaction. Never starts matching. */
export async function handoffRequest(transaction: Prisma.TransactionClient, input: HandoffInput) {
  await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "Request" WHERE "id"=${input.requestId}::uuid FOR UPDATE`)
  const request = await transaction.request.findUnique({ where: { id: input.requestId } })
  const adviceDossier = request ? await transaction.adviceDossier.findUnique({ where: { id: request.adviceDossierId } }) : null
  const assignmentHandoff = request ? await transaction.requestAssignmentHandoff.findUnique({ where: { requestId: request.id } }) : null
  const existingAssignment = request ? await transaction.assignment.findUnique({ where: { requestId: request.id } }) : null
  const organization = request ? await transaction.organization.findUnique({ where: { id: request.organizationId }, select: { status: true, organizationType: true } }) : null
  const publicationEvents = request ? await transaction.requestEvent.findMany({ where: { requestId: request.id, type: 'REQUEST_PUBLISHED' } }) : []
  const dependentCounts = request ? [
    await transaction.requestInterest.count({ where: { requestId: request.id } }),
    await transaction.requestOfferSlot.count({ where: { requestId: request.id } }),
    await transaction.creditTransaction.count({ where: { requestId: request.id } }),
    await transaction.marketplaceReliabilityEvent.count({ where: { requestId: request.id } }),
  ] : []
  if (!request || request.organizationId !== input.organizationId || request.tenantId !== input.organizationId) throw new RequestHandoffError('ACCESS_DENIED')
  if (!adviceDossier || organization?.status !== 'ACTIVE' || organization.organizationType !== 'CLIENT') throw new RequestHandoffError('NOT_ELIGIBLE')
  if (input.mode === 'RECOVERY') {
    await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
  } else {
    const member = await transaction.organizationMembership.findFirst({ where: {
      userId: input.actorUserId, organizationId: input.organizationId, status: 'ACTIVE',
      user: { status: 'ACTIVE', accountType: 'CLIENT' }, organization: { status: 'ACTIVE', organizationType: 'CLIENT' },
    } })
    if (!member || adviceDossier.ownerUserId !== input.actorUserId) throw new RequestHandoffError('ACCESS_DENIED')
  }
  if (assignmentHandoff) {
    if (existingAssignment?.id !== assignmentHandoff.assignmentId || assignmentHandoff.adviceDossierVersionId !== input.sourceVersionId) throw new RequestHandoffError('INTEGRITY_ERROR')
    return assignmentHandoff
  }
  if (input.mode === 'RECOVERY' && (publicationEvents.length !== 1 || publicationEvents[0]!.occurredAt.getTime() !== request.publishedAt?.getTime())) throw new RequestHandoffError('NOT_ELIGIBLE')
  if (existingAssignment || request.status !== 'PUBLISHED' || !request.publishedAt || (input.mode === 'RECOVERY' && adviceDossier.sourceRoute !== 'SIMPLE_ADVICE')) throw new RequestHandoffError('NOT_ELIGIBLE')
  if (dependentCounts.some(count => count !== 0)) throw new RequestHandoffError('NOT_ELIGIBLE')
  const version = await transaction.adviceDossierVersion.findFirst({ where: { id: input.sourceVersionId, adviceDossierId: request.adviceDossierId } })
  if (!version || (request.adviceDossierVersionId && request.adviceDossierVersionId !== version.id)) throw new RequestHandoffError('INTEGRITY_ERROR')
  const value = simpleAdviceSchema.parse(version.simpleRequestSnapshot)
  if (value.requestTitle !== request.title || value.requestDescription !== request.publicSummary ||
    JSON.stringify(value.primaryExpertise ? [value.primaryExpertise] : []) !== JSON.stringify(request.primaryExpertiseCodes) ||
    JSON.stringify(value.additionalExpertises) !== JSON.stringify(request.additionalExpertiseCodes)) throw new RequestHandoffError('INTEGRITY_ERROR')
  // Legacy recovery requires unambiguous original v1, never the current/latest version.
  if (input.mode === 'RECOVERY' && (version.versionNumber !== 1 || adviceDossier.currentVersionNumber !== 1)) throw new RequestHandoffError('NOT_ELIGIBLE')
  const identities = [...(value.primaryExpertise ? [value.primaryExpertise] : []), ...value.additionalExpertises]
  const references = await resolveHandoffSpecialismReferences(transaction, identities)
  const sector = request.sectorCode ? await transaction.providerSectorTaxonomyMap.findFirst({
    where: { term: { code: request.sectorCode, isActive: true, version: { status: 'PUBLISHED' } }, sector: { isActive: true } },
  }) : null
  if (request.sectorCode && !sector) throw new RequestHandoffError('REFERENCE_MISSING')
  let registeredCity: string | null = null
  let province: string | null = null
  if (usesLocation(value, 'ORGANIZATION') && value.organizationLocationId) {
    const location = await transaction.organizationLocation.findFirst({ where: { id: value.organizationLocationId, organizationId: input.organizationId, archivedAt: null }, select: { city: true, province: true } })
    if (!location) throw new RequestHandoffError('NOT_ELIGIBLE')
    registeredCity = location.city; province = location.province
  }
  const places = [...new Set([...(usesLocation(value, 'ORGANIZATION') ? [value.organizationLocationCity || registeredCity || request.region] : []), ...(usesLocation(value, 'OTHER_LOCATION') ? [value.otherLocationCity] : [])].filter((v): v is string => Boolean(v)))]
  const items = places.length > 1 ? places.map((placeOrRegion, index) => ({ position: index + 1, placeOrRegion, normalizedValue: placeOrRegion.toLocaleLowerCase('nl-NL') })) : []
  const anchor = input.mode === 'RECOVERY' ? input.at : request.publishedAt
  const deadline = responseDeadline(anchor)
  const fields = {
    title: request.title, description: request.publicSummary,
    primarySpecialismId: references.find(r => r.tier === 'PRIMARY')?.specialismId ?? null,
    sectorId: sector?.sectorId ?? null, employeeCount: null,
    desiredStartDate: value.desiredStartDate ? new Date(value.desiredStartDate) : null, responseDeadline: deadline,
    locationType: items.length ? 'MULTIPLE' as const : places.length ? 'OTHER' as const : value.workLocationMode === 'REMOTE' ? 'REMOTE' as const : 'UNKNOWN' as const,
    locationId: null, locationName: null, locationAddressLine: null, locationPostalCode: null,
    locationCity: places.length === 1 ? places[0]! : null, locationProvince: province, locationCountryCode: null,
    locationRegion: province, locationDescription: null, locationCount: items.length || null,
    allowsRemoteWork: usesLocation(value, 'REMOTE'),
  }
  if (input.legacyIntakeId) {
    const intake = await transaction.intake.findUnique({ where: { id: input.legacyIntakeId }, include: { adviceDossierHandoff: true } })
    if (input.mode !== 'PUBLICATION' || !intake || intake.clientOrganizationId !== request.organizationId ||
        (intake.adviceDossierHandoff?.adviceDossierId ?? intake.id) !== request.adviceDossierId) throw new RequestHandoffError('ACCESS_DENIED')
  }
  const legacy = input.legacyIntakeId ? await transaction.assignment.findUnique({ where: { intakeId: input.legacyIntakeId }, include: {
    _count: { select: { marketplaceMatchRuns: true, marketplaceInvitations: true, marketplaceParticipations: true, marketplaceQuotes: true, providerSelections: true, marketplaceMessageChannels: true } },
  } }) : null
  if (legacy && (input.mode !== 'PUBLICATION' || legacy.clientOrganizationId !== request.organizationId || legacy.requestId || legacy.publishedAt || legacy.archivedAt || !['DRAFT', 'READY_FOR_REVIEW'].includes(legacy.status) || Object.values(legacy._count).some(n => n > 0))) throw new RequestHandoffError('NOT_ELIGIBLE')
  const assignmentVersion = legacy ? legacy.version + 1 : 1
  if (legacy) {
    await transaction.assignmentSpecialism.deleteMany({ where: { assignmentId: legacy.id } })
    await transaction.assignmentLocationItem.deleteMany({ where: { assignmentId: legacy.id } })
  }
  const assignmentData = {
    ...fields, requestId: request.id, clientOrganizationId: request.organizationId, createdByUserId: adviceDossier.ownerUserId,
    status: 'READY_FOR_REVIEW' as const, version: assignmentVersion,
    locationItems: items.length ? { create: items } : undefined,
  }
  const assignment = legacy
    ? await transaction.assignment.update({ where: { id: legacy.id }, data: { ...assignmentData, createdByUserId: legacy.createdByUserId } })
    : await transaction.assignment.create({ data: assignmentData })
  await createHandoffAssignmentSpecialisms(transaction, assignment.id, references)
  await transaction.assignmentRevision.create({ data: { ...fields, assignmentId: assignment.id, version: assignmentVersion,
    changedByUserId: input.actorUserId, locationItems: items.length ? { create: items } : undefined } })
  await transaction.assignment.update({ where: { id: assignment.id }, data: { status: 'OPEN', publishedAt: anchor, publishedVersion: assignmentVersion, publishedByUserId: input.actorUserId } })
  await transaction.assignmentStatusHistory.create({ data: { assignmentId: assignment.id, fromStatus: 'READY_FOR_REVIEW', toStatus: 'OPEN', changedByUserId: input.actorUserId, createdAt: anchor, reason: 'Canonieke overdracht van gepubliceerde opdracht.' } })
  if (!request.adviceDossierVersionId) await transaction.request.update({ where: { id: request.id }, data: { adviceDossierVersionId: version.id } })
  const snapshot = JSON.parse(JSON.stringify({ schemaVersion: 1, requestId: request.id, adviceDossierVersionId: version.id,
    ...(input.legacyIntakeId ? { legacyIntakeId: input.legacyIntakeId, legacyAssignmentId: legacy?.id ?? null, legacyAssignmentVersion: legacy?.version ?? null } : {}),
    publicationTimestamp: request.publishedAt, handoffTimestamp: input.at, mode: input.mode,
    deadlinePolicy: RESPONSE_DEADLINE_POLICY, deadlineAnchor: anchor, responseDeadline: deadline,
    primaryExpertise: value.primaryExpertise, additionalExpertises: value.additionalExpertises,
    expertiseSelectionSource: value.expertiseSelectionSource, references, requestedStart: request.requestedStart,
    matchingBlockReason: value.primaryExpertise ? null : 'PRIMARY_EXPERTISE_REQUIRED', assignment: fields, locationItems: items,
  })) as Prisma.InputJsonObject
  const handoff = await transaction.requestAssignmentHandoff.create({ data: {
    requestId: request.id, assignmentId: assignment.id, adviceDossierVersionId: version.id, createdByUserId: input.actorUserId,
    snapshot, snapshotChecksum: hashProviderJson(snapshot as CanonicalValue).sha256, schemaVersion: 1,
    idempotencyKey: `request:${request.id}:assignment-handoff`, createdAt: input.at,
  } })
  await writeMarketplaceAudit(transaction, { actorUserId: input.actorUserId, actorRole: input.mode === 'RECOVERY' ? 'PLATFORM_ADMIN' : 'CLIENT_REQUEST_OWNER',
    organizationId: request.organizationId, action: 'REQUEST_ASSIGNMENT_HANDOFF', entityType: 'Request', entityId: request.id,
    correlationKey: handoff.idempotencyKey, metadata: { handoffId: handoff.id, mode: input.mode, snapshotChecksum: handoff.snapshotChecksum } })
  return handoff
}

/** Explicit allowlist, at most two Requests. No discovery loop or automatic production writes. */
export async function recoverRequestAssignments(actorUserId: string, candidates: readonly { requestId: string; organizationId: string; sourceVersionId: string }[], at = new Date()) {
  if (candidates.length < 1 || candidates.length > 2 || new Set(candidates.map(c => c.requestId)).size !== candidates.length) throw new RequestHandoffError('NOT_ELIGIBLE')
  return getPrisma().$transaction(async transaction => {
    await requireMarketplacePlatformAdmin(transaction, actorUserId)
    const results = []
    for (const candidate of [...candidates].sort((a,b) => a.requestId.localeCompare(b.requestId))) results.push(await handoffRequest(transaction, { ...candidate, actorUserId, at, mode: 'RECOVERY' }))
    return results
  }, { isolationLevel: 'Serializable', timeout: 15000 })
}
