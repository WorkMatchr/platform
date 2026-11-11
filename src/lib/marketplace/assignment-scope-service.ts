import type { Prisma } from '@/generated/prisma/client'
import { hashProviderJson } from '@/lib/providers/provider-canonical-json'
import { decisionHistory, qualificationAt } from '@/lib/providers/provider-effective-qualification'
import { qualifyScopePolicy, type ScopePolicyRow } from './assignment-scope-policy'
import { simpleAdviceSchema, simpleAdviceSummary } from '@/lib/requests/simple-advice-contract'
import { classifyTask, knownService, launchScopes, type Service } from './assignment-scope'
import { requireMarketplacePlatformAdmin } from './marketplace-authorization'
import { MarketplaceServiceError } from './marketplace-errors'
import { writeMarketplaceAudit } from './marketplace-events'

type Tx = Prisma.TransactionClient
export const fingerprint = (v: unknown) => hashProviderJson(JSON.parse(JSON.stringify(v))).sha256
export async function readAssignmentScope(tx: Tx, id: string, service: string, now: Date, lock = true) {
  if (!knownService(service))
    throw new MarketplaceServiceError('VALIDATION_ERROR', 'Kies de dienst waarvoor u aanbieders zoekt.')
  if (lock) await tx.$queryRaw`SELECT id FROM "Assignment" WHERE id=${id}::uuid FOR UPDATE`
  const a = await tx.assignment.findUniqueOrThrow({
    where: { id },
    include: {
      publishedRevision: true,
      primarySpecialism: {
        include: { providerSpecialismTaxonomyMap: { include: { term: { include: { version: true } } } } },
      },
      specialisms: {
        orderBy: { specialismId: 'asc' },
        include: {
          specialism: {
            include: { providerSpecialismTaxonomyMap: { include: { term: { include: { version: true } } } } },
          },
        },
      },
      locationItems: { orderBy: { position: 'asc' } },
      request: true,
      requestHandoff: { select: { snapshot: true } },
    },
  })
  const configs = await tx.providerCapabilityRequirementConfig.findMany({
    where: {
      status: 'PUBLISHED',
      effectiveFrom: { lte: now },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
    },
    take: 2,
    include: {
      requirements: {
        where: { serviceTerm: { code: service } },
        include: {
          serviceTerm: { include: { version: { include: { taxonomy: true } } } },
          requirementTerm: { include: { version: { include: { taxonomy: true } } } },
        },
      },
    },
  })
  const config = configs.length === 1 ? configs[0] : null
  const row: ScopePolicyRow | undefined = config?.requirements[0]
  const policyValid =
    !!config &&
    !!config.checksum?.match(/^[a-f0-9]{64}$/) &&
    !!config.publishedAt &&
    config.publishedAt <= now &&
    config.requirements.length === 1 &&
    !!row &&
    qualifyScopePolicy(row)
  const { updatedAt, version, status, ...content } = a
  void updatedAt
  void version
  // A final award closes the assignment without changing its matching criteria.
  // For read-only visibility, compare against its open, published snapshot.
  if (!lock && status === 'AWARDED' && content.closedAt) {
    const award = await tx.awardDecision.findUnique({
      where: { assignmentId: id },
      select: { status: true, decidedAt: true },
    })
    if (award?.status === 'FINAL' && award.decidedAt.getTime() === content.closedAt.getTime()) {
      content.closedAt = null
    }
  }
  const revision = a.publishedRevision
  const specialistRows = [a.primarySpecialism, ...a.specialisms.map((s) => s.specialism)]
  const specialistsValid = specialistRows.every(
    (s) =>
      s?.isActive &&
      s.providerSpecialismTaxonomyMap?.term.isActive &&
      s.providerSpecialismTaxonomyMap.term.version.status === 'PUBLISHED',
  )
  const handoff = a.requestHandoff?.snapshot
  const refs = handoff && typeof handoff === 'object' && !Array.isArray(handoff) ? handoff.references : null
  const currentRefs =
    !a.request ||
    (Array.isArray(refs) &&
      refs.length > 0 &&
      refs.every((r) => {
        if (!r || typeof r !== 'object' || Array.isArray(r)) return false
        const s = specialistRows.find((s) => s?.id === r.specialismId),
          t = s?.providerSpecialismTaxonomyMap?.term
        return !!t && r.termId === t.id && r.taxonomyVersionId === t.versionId && r.capabilityCode === t.code
      }))
  const fieldsMatch =
    !!revision &&
    Object.entries(revision).every(
      ([k, v]) =>
        !Object.hasOwn(a, k) ||
        ['id', 'createdAt', 'version'].includes(k) ||
        JSON.stringify(v) === JSON.stringify(a[k as keyof typeof a]),
    )
  const sourceValid =
    fieldsMatch &&
    currentRefs &&
    specialistsValid &&
    (!a.request ||
      (a.request.title === a.title &&
        a.request.publicSummary === a.description &&
        a.request.organizationId === a.clientOrganizationId &&
        a.request.tenantId === a.clientOrganizationId))
  const original = a.request?.adviceDossierVersionId
    ? await tx.adviceDossierVersion.findUnique({
        where: { id: a.request.adviceDossierVersionId },
        select: { simpleRequestSnapshot: true },
      })
    : null
  const parsed = simpleAdviceSchema.safeParse(original?.simpleRequestSnapshot)
  const simple = parsed.success ? parsed.data : null
  const plain =
    simple &&
    simple.routeChoice === 'KNOWS_EXPERTISE' &&
    !simple.topicSituations &&
    !simple.helpTopicOther &&
    !simple.desiredOutcomeOther &&
    (simple.desiredOutcome === 'ADVICE' ||
      (service === 'IMPLEMENTATION_SUPPORT' && simple.desiredOutcome === 'IMPLEMENTATION')) &&
    simple.requestDescription === a.description &&
    simple.requestTitle === a.title &&
    (simple.workLocationMode === 'REMOTE' ||
      (simple.workLocationMode === 'ORGANIZATION' && !!simple.organizationLocationId)) &&
    a.request?.notes ===
      simpleAdviceSummary(simple, a.locationCity ?? undefined)
        .filter(([label]) => !['Beschrijving', 'Waar heeft u hulp bij?'].includes(label))
        .map(([k, v]) => k + ': ' + v)
        .join('\n')
  const secondary = [a.locationDescription, plain ? null : a.request?.notes].filter((s): s is string => !!s)
  const specialisms = specialistRows.flatMap((s) => (s ? [s.slug] : []))
  const decision = classifyTask(service, a.title, a.description, secondary, specialisms)
  const digest = fingerprint({
    algorithm: 1,
    service,
    definition: launchScopes[service],
    original,
    content,
    policy: config,
  })
  const blocked = !policyValid || !sourceValid
  const event =
    !blocked && decision.reviewable
      ? await tx.marketplaceAuditEvent.findUnique({ where: { correlationKey: 'SCOPE_DECISION:' + digest } })
      : null
  const audit =
    event?.action === 'ASSIGNMENT_SCOPE_DECIDED' &&
    event.actorUserId &&
    event.actorRole === 'PLATFORM_ADMIN' &&
    event.entityType === 'Assignment' &&
    event.entityId === id &&
    event.organizationId === a.clientOrganizationId
      ? event
      : null
  const state = blocked
    ? 'BEOORDELING_NODIG'
    : audit?.nextState === 'BINNEN_SCOPE' || audit?.nextState === 'BUITEN_SCOPE'
      ? audit.nextState
      : decision.state
  const requested =
    decision.reviewable &&
    !blocked &&
    !audit &&
    !!(await tx.marketplaceAuditEvent.findUnique({
      where: { correlationKey: 'SCOPE_REQUEST:' + digest },
      select: { id: true },
    }))
  return {
    service,
    state,
    digest,
    requested,
    revision: a.publishedVersion,
    configId: config?.id ?? null,
    serviceTermId: row?.serviceTerm.id ?? null,
    reviewEventId:audit?.id??null,
    policyVersion: config?.version ?? null,
    catalogVersion: row?.serviceTerm.version.version ?? null,
    reviewable: !blocked && decision.reviewable && !audit,
    organizationId: a.clientOrganizationId,
    title: a.title,
    description: a.description,
    secondary,
    specialisms,
    message: !policyValid
      ? 'Voor deze dienst is geen geldige gepubliceerde toelatingsconfiguratie beschikbaar.'
      : !sourceValid
        ? 'De opdracht of deskundigheid wijkt af van de geldige publicatie. Werk de opdracht eerst bij.'
        : audit
          ? 'De inhoudelijke beoordeling is afgerond.'
          : decision.message,
  }
}
export type Scope = Awaited<ReturnType<typeof readAssignmentScope>>
export function requireWithin(scope: Scope, expected?: string) {
  if (scope.state !== 'BINNEN_SCOPE' || (expected !== undefined && scope.digest !== expected))
    throw new MarketplaceServiceError(
      'NOT_SELECTABLE',
      scope.digest !== expected && expected !== undefined
        ? 'De opdracht of dienstconfiguratie is gewijzigd. Een nieuwe selectie is nodig.'
        : scope.message,
    )
}
export async function checkRunScope(tx: Tx, id: string, snapshot: Prisma.JsonValue, at: Date, lock = true) {
  const data = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {}
  if (!knownService(data.scopeService) || typeof data.scopeDigest !== 'string')
    throw new MarketplaceServiceError(
      'NOT_SELECTABLE',
      'De oude selectie heeft nog geen geldige opdrachtcontrole.',
    )
  const scope = await readAssignmentScope(tx, id, data.scopeService, at, lock)
  requireWithin(scope, data.scopeDigest)
  return scope
}
export async function scopedCapabilities(tx: Tx, profileId: string, scope: Scope, at: Date) {
  const caps = await tx.providerCapability.findMany({
    where: { providerProfileId: profileId, status: 'ACTIVE' },
    select: {
      version: true,
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          version: true,
          serviceTermId: true,
          specialismTerm: { select: { code: true, isActive: true, version: { select: { status: true } } } },
          validFrom: true,
          validUntil: true,
        },
      },
      qualificationDecisions: {
        ...decisionHistory,
        select: { ...decisionHistory.select, requirementConfigId: true },
      },
    },
  })
  return caps.flatMap((cap) => {
    const rev = cap.revisions[0],
      current = qualificationAt(cap.qualificationDecisions, profileId, at).current
    if (
      !rev ||
      rev.version !== cap.version ||
      rev.serviceTermId !== scope.serviceTermId ||
      (rev.validFrom && rev.validFrom > at) ||
      (rev.validUntil && rev.validUntil <= at) ||
      (rev.specialismTerm &&
        (!rev.specialismTerm.isActive || rev.specialismTerm.version.status !== 'PUBLISHED')) ||
      !current ||
      !scope.configId ||
      cap.qualificationDecisions.find((d) => d.id === current.id)?.requirementConfigId !== scope.configId
    )
      return []
    return [rev.specialismTerm?.code ?? null]
  })
}
export async function eligibleForScopedExpertise(
  tx: Tx,
  profile: string,
  scope: Scope,
  expertise: unknown,
  at: Date,
) {
  if (typeof expertise !== 'string') return false
  const current = await scopedCapabilities(tx, profile, scope, at)
  return current.length > 0 && (expertise === scope.service || current.includes(expertise))
}
export const invitationScopeSelect = {
  assignmentId: true,
  providerProfileId: true,
  snapshot: true,
  matchRun: { select: { assignmentSnapshot: true } },
} satisfies Prisma.ProviderInvitationSelect

type ScopedInvitation = Prisma.ProviderInvitationGetPayload<{ select: typeof invitationScopeSelect }>

export async function requireCurrentInvitationScope(tx: Tx, inv: ScopedInvitation, at: Date, lock = true) {
  const scope = await checkRunScope(tx, inv.assignmentId, inv.matchRun.assignmentSnapshot, at, lock)
  const expertise = (inv.snapshot as Record<string, unknown> | null)?.recipientExpertise
  if (!await eligibleForScopedExpertise(tx, inv.providerProfileId, scope, expertise, at))
    throw new MarketplaceServiceError('NOT_SELECTABLE')
}

export async function visibleScopedInvitation(tx: Tx, inv: ScopedInvitation, at: Date) {
  try {
    await requireCurrentInvitationScope(tx, inv, at, false)
    return true
  } catch (error) {
    if (error instanceof MarketplaceServiceError) return false
    throw error
  }
}
export async function decideScope(
  tx: Tx,
  userId: string,
  id: string,
  service: Service,
  expected: string,
  inside: boolean,
  reason: string,
) {
  await requireMarketplacePlatformAdmin(tx, userId)
  const scope = await readAssignmentScope(tx, id, service, new Date())
  if (!scope.reviewable || scope.digest !== expected || reason.trim().length < 10 || reason.length > 500)
    throw new MarketplaceServiceError('CONFLICT')
  await writeMarketplaceAudit(tx, {
    actorUserId: userId,
    actorRole: 'PLATFORM_ADMIN',
    organizationId: scope.organizationId,
    entityType: 'Assignment',
    entityId: id,
    action: 'ASSIGNMENT_SCOPE_DECIDED',
    previousState: 'BEOORDELING_NODIG',
    nextState: inside ? 'BINNEN_SCOPE' : 'BUITEN_SCOPE',
    reason: reason.trim(),
    correlationKey: 'SCOPE_DECISION:' + scope.digest,
    metadata: {
      digest: scope.digest,
      service,
      policyVersion: scope.policyVersion,
      catalogVersion: scope.catalogVersion,
      revision: scope.revision,
      configId: scope.configId,
    },
  })
}
