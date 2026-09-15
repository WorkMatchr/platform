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
  requestId: string; organizationId: string; actorUserId: string
  sourceVersionId: string; at: Date; mode: 'PUBLICATION' | 'RECOVERY'
}

/** Called only within the publication/recovery Serializable transaction. Never starts matching. */
export async function handoffRequest(transaction: Prisma.TransactionClient, input: HandoffInput) {
  await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "Request" WHERE "id"=${input.requestId}::uuid FOR UPDATE`)
  const request = await transaction.request.findUnique({ where: { id: input.requestId }, include: {
    adviceDossier: true, assignmentHandoff: true, assignment: true,
    organization: { select: { status: true, organizationType: true } },
    events: { where: { type: 'REQUEST_PUBLISHED' } },
    _count: { select: { interests: true, offerSlots: true, creditTransactions: true, reliabilityEvents: true } },
  } })
  if (!request || request.organizationId !== input.organizationId || request.tenantId !== input.organizationId) throw new RequestHandoffError('ACCESS_DENIED')
  if (request.organization.status !== 'ACTIVE' || request.organization.organizationType !== 'CLIENT') throw new RequestHandoffError('NOT_ELIGIBLE')
  if (input.mode === 'RECOVERY') {
    await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
  } else {
    const member = await transaction.organizationMembership.findFirst({ where: {
      userId: input.actorUserId, organizationId: input.organizationId, status: 'ACTIVE',
      user: { status: 'ACTIVE', accountType: 'CLIENT' }, organization: { status: 'ACTIVE', organizationType: 'CLIENT' },
    } })
    if (!member || request.adviceDossier.ownerUserId !== input.actorUserId) throw new RequestHandoffError('ACCESS_DENIED')
  }
  if (request.assignmentHandoff) {
    if (request.assignment?.id !== request.assignmentHandoff.assignmentId || request.assignmentHandoff.adviceDossierVersionId !== input.sourceVersionId) throw new RequestHandoffError('INTEGRITY_ERROR')
    return request.assignmentHandoff
  }
  if (input.mode === 'RECOVERY' && (request.events.length !== 1 || request.events[0]!.occurredAt.getTime() !== request.publishedAt?.getTime())) throw new RequestHandoffError('NOT_ELIGIBLE')
  if (request.assignment || request.status !== 'PUBLISHED' || !request.publishedAt || request.adviceDossier.sourceRoute !== 'SIMPLE_ADVICE') throw new RequestHandoffError('NOT_ELIGIBLE')
  if (Object.values(request._count).some(count => count !== 0)) throw new RequestHandoffError('NOT_ELIGIBLE')
  const version = await transaction.adviceDossierVersion.findFirst({ where: { id: input.sourceVersionId, adviceDossierId: request.adviceDossierId } })
  if (!version || (request.adviceDossierVersionId && request.adviceDossierVersionId !== version.id)) throw new RequestHandoffError('INTEGRITY_ERROR')
  const value = simpleAdviceSchema.parse(version.simpleRequestSnapshot)
  if (value.requestTitle !== request.title || value.requestDescription !== request.publicSummary ||
    JSON.stringify(value.primaryExpertise ? [value.primaryExpertise] : []) !== JSON.stringify(request.primaryExpertiseCodes) ||
    JSON.stringify(value.additionalExpertises) !== JSON.stringify(request.additionalExpertiseCodes)) throw new RequestHandoffError('INTEGRITY_ERROR')
  // Legacy recovery requires unambiguous original v1, never the current/latest version.
  if (input.mode === 'RECOVERY' && (version.versionNumber !== 1 || request.adviceDossier.currentVersionNumber !== 1)) throw new RequestHandoffError('NOT_ELIGIBLE')
  const identities = [...(value.primaryExpertise ? [value.primaryExpertise] : []), ...value.additionalExpertises]
  const references = await Promise.all(identities.map(async (code, position) => {
    const specialism = await transaction.specialism.findFirst({ where: { slug: expertiseSpecialismSlugs[code], isActive: true },
      include: { providerSpecialismTaxonomyMap: { include: { term: { include: { version: true } } } } } })
    const term = specialism?.providerSpecialismTaxonomyMap?.term
    if (!specialism || !term?.isActive || term.version.status !== 'PUBLISHED') throw new RequestHandoffError('REFERENCE_MISSING')
    return { expertiseId: code, specialismId: specialism.id, capabilityCode: term.code, termId: term.id,
      taxonomyVersionId: term.versionId, tier: position === 0 ? 'PRIMARY' as const : 'ADDITIONAL' as const }
  }))
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
  const assignment = await transaction.assignment.create({ data: {
    ...fields, requestId: request.id, clientOrganizationId: request.organizationId, createdByUserId: request.adviceDossier.ownerUserId,
    status: 'READY_FOR_REVIEW', version: 1,
    specialisms: { create: references.map(r => ({ specialismId: r.specialismId, isRequired: r.tier === 'PRIMARY' })) },
    locationItems: items.length ? { create: items } : undefined,
  } })
  await transaction.assignmentRevision.create({ data: { ...fields, assignmentId: assignment.id, version: 1,
    changedByUserId: input.actorUserId, locationItems: items.length ? { create: items } : undefined } })
  await transaction.assignment.update({ where: { id: assignment.id }, data: { status: 'OPEN', publishedAt: anchor, publishedVersion: 1, publishedByUserId: input.actorUserId } })
  await transaction.assignmentStatusHistory.create({ data: { assignmentId: assignment.id, fromStatus: 'READY_FOR_REVIEW', toStatus: 'OPEN', changedByUserId: input.actorUserId, createdAt: anchor, reason: 'Canonieke overdracht van gepubliceerde opdracht.' } })
  if (!request.adviceDossierVersionId) await transaction.request.update({ where: { id: request.id }, data: { adviceDossierVersionId: version.id } })
  const snapshot = JSON.parse(JSON.stringify({ schemaVersion: 1, requestId: request.id, adviceDossierVersionId: version.id,
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
