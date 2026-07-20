import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { hashProviderJson, type CanonicalValue } from '@/lib/providers/provider-canonical-json'
import { requireClientMarketplaceManager, requireMarketplacePlatformAdmin } from './marketplace-authorization'
import {
  MARKETPLACE_CREDIT_COST,
  MARKETPLACE_ENGINE_VERSION,
  MARKETPLACE_MAX_SELECTIONS,
  MARKETPLACE_MODEL_VERSION,
  MARKETPLACE_RULE_VERSION,
  MARKETPLACE_TAXONOMY_CONTRACT,
} from './marketplace-config'
import { MarketplaceServiceError } from './marketplace-errors'
import {
  activeOrganizationRecipients,
  createMarketplaceNotification,
  enqueueMarketplaceEmail,
  writeMarketplaceAudit,
} from './marketplace-events'
import { evaluateMatchingCandidate, rankMatchingCandidates, type MatchingProviderFacts } from './matching-rules'

type TrustedPayload = {
  capabilities: Array<{ serviceCode: string; specialismCode: string | null; deliveryModes: string[] }>
  sectors: Array<{ sectorCode: string }>
  workAreas: Array<{ regionCode: string }>
}

function asCanonical(value: unknown): CanonicalValue {
  return JSON.parse(JSON.stringify(value)) as CanonicalValue
}

function readTrustedPayload(value: Prisma.JsonValue): TrustedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  if (!Array.isArray(source.capabilities) || !Array.isArray(source.sectors) || !Array.isArray(source.workAreas)) return null
  const capabilities = source.capabilities.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    if (typeof record.serviceCode !== 'string' || !Array.isArray(record.deliveryModes)) return []
    return [{
      serviceCode: record.serviceCode,
      specialismCode: typeof record.specialismCode === 'string' ? record.specialismCode : null,
      deliveryModes: record.deliveryModes.filter((mode): mode is string => typeof mode === 'string'),
    }]
  })
  const sectors = source.sectors.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const sectorCode = (item as Record<string, unknown>).sectorCode
    return typeof sectorCode === 'string' ? [{ sectorCode }] : []
  })
  const workAreas = source.workAreas.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const regionCode = (item as Record<string, unknown>).regionCode
    return typeof regionCode === 'string' ? [{ regionCode }] : []
  })
  return capabilities.length > 0 && workAreas.length > 0 ? { capabilities, sectors, workAreas } : null
}

function normalizeRegion(province: string | null | undefined) {
  return province?.trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_') ?? null
}

export async function runMarketplaceMatching(input: {
  actorUserId: string
  organizationId: string
  assignmentId: string
  expectedAssignmentVersion: number
  idempotencyKey: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  return getPrisma().$transaction(async (transaction) => {
    const existing = await transaction.marketplaceMatchRun.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { candidates: { orderBy: { rank: 'asc' } }, invitations: true },
    })
    if (existing) return existing

    const membership = await requireClientMarketplaceManager(transaction, input.actorUserId, input.organizationId)
    const assignment = await transaction.assignment.findFirst({
      where: {
        id: input.assignmentId,
        clientOrganizationId: input.organizationId,
        status: 'OPEN',
        version: input.expectedAssignmentVersion,
        archivedAt: null,
        publishedVersion: { not: null },
      },
      select: {
        id: true,
        version: true,
        title: true,
        description: true,
        primarySpecialismId: true,
        sectorId: true,
        allowsRemoteWork: true,
        responseDeadline: true,
        publishedVersion: true,
        location: { select: { province: true } },
      },
    })
    if (!assignment) throw new MarketplaceServiceError('INVALID_STATE')
    if (!assignment.responseDeadline || assignment.responseDeadline <= now) throw new MarketplaceServiceError('DEADLINE_PASSED')
    if (!assignment.primarySpecialismId) throw new MarketplaceServiceError('VALIDATION_ERROR')

    const specialismMapping = await transaction.providerSpecialismTaxonomyMap.findUnique({
      where: { specialismId: assignment.primarySpecialismId },
      select: { term: { select: { code: true } } },
    })
    if (!specialismMapping) throw new MarketplaceServiceError('VALIDATION_ERROR')
    const sectorMapping = assignment.sectorId
      ? await transaction.providerSectorTaxonomyMap.findUnique({ where: { sectorId: assignment.sectorId }, select: { term: { select: { code: true } } } })
      : null

    const assignmentSnapshot = {
      assignmentId: assignment.id,
      assignmentVersion: assignment.version,
      publishedVersion: assignment.publishedVersion,
      capabilityCode: specialismMapping.term.code,
      sectorCode: sectorMapping?.term.code ?? null,
      regionCode: normalizeRegion(assignment.location?.province),
      allowsRemoteWork: assignment.allowsRemoteWork,
      responseDeadline: assignment.responseDeadline.toISOString(),
    }
    const inputChecksum = hashProviderJson(asCanonical(assignmentSnapshot)).sha256
    const projections = await transaction.trustedProviderProjection.findMany({
      where: {
        validFrom: { lte: now },
        validUntil: { gt: now },
        invalidation: null,
        providerProfile: {
          archivedAt: null,
          lifecycleStatus: 'QUALIFIED',
          readinessStatus: 'READY',
          platformQualificationStatus: 'QUALIFIED',
          selectabilityStatus: 'SELECTABLE',
          organization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] } },
          blocks: { none: { release: null } },
        },
      },
      orderBy: [{ providerProfileId: 'asc' }, { sourceVersion: 'desc' }],
      select: {
        id: true,
        providerProfileId: true,
        payload: true,
        sha256: true,
        sourceVersion: true,
        providerProfile: { select: { organizationId: true } },
      },
    })
    type ProjectionRecord = (typeof projections)[number]
    const latestByProvider = new Map<string, ProjectionRecord>()
    for (const projection of projections) {
      if (!latestByProvider.has(projection.providerProfileId)) latestByProvider.set(projection.providerProfileId, projection)
    }
    const evaluated: Array<{
      projection: (typeof projections)[number]
      providerProfileId: string
      provider: MatchingProviderFacts
      result: ReturnType<typeof evaluateMatchingCandidate>
    }> = []
    for (const projection of latestByProvider.values()) {
      const payload = readTrustedPayload(projection.payload)
      if (!payload) continue
      const provider = { providerProfileId: projection.providerProfileId, ...payload }
      evaluated.push({
        projection,
        providerProfileId: projection.providerProfileId,
        provider,
        result: evaluateMatchingCandidate({
          assignmentId: assignment.id,
          capabilityCode: specialismMapping.term.code,
          sectorCode: sectorMapping?.term.code ?? null,
          regionCode: normalizeRegion(assignment.location?.province),
          allowsRemoteWork: assignment.allowsRemoteWork,
        }, provider),
      })
    }
    const ranked = rankMatchingCandidates(evaluated)
    const selectedIds = new Set(ranked.slice(0, MARKETPLACE_MAX_SELECTIONS).map((candidate) => candidate.providerProfileId))
    const confidenceReasons = []
    if (evaluated.length < 3) confidenceReasons.push('BEPERKT_KANDIDAATVOLUME')
    if (evaluated.length === 0) confidenceReasons.push('GEEN_GELDIGE_PROVIDERPROJECTIES')
    const confidenceLevel = confidenceReasons.length === 0 ? 'HOOG' : 'LAAG'

    const run = await transaction.marketplaceMatchRun.create({
      data: {
        assignmentId: assignment.id,
        assignmentVersion: assignment.version,
        engineVersion: MARKETPLACE_ENGINE_VERSION,
        modelVersion: MARKETPLACE_MODEL_VERSION,
        ruleVersion: MARKETPLACE_RULE_VERSION,
        taxonomyVersion: MARKETPLACE_TAXONOMY_CONTRACT,
        startedByUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        confidenceLevel,
        confidenceReasons,
        assignmentSnapshot: assignmentSnapshot as Prisma.InputJsonValue,
        inputChecksum,
      },
      select: { id: true },
    })
    const candidateRecords: Array<{ id: string; providerProfileId: string; status: string; rank: number | null }> = []
    for (const candidate of evaluated) {
      const rank = ranked.findIndex((rankedCandidate) => rankedCandidate.providerProfileId === candidate.providerProfileId) + 1
      const isSelected = selectedIds.has(candidate.providerProfileId)
      const status = candidate.result.status === 'EXCLUDED' ? 'EXCLUDED' : isSelected ? 'SELECTED' : 'ELIGIBLE'
      const providerSnapshot = {
        projectionId: candidate.projection.id,
        projectionChecksum: candidate.projection.sha256,
        projectionSourceVersion: candidate.projection.sourceVersion,
        providerProfileId: candidate.providerProfileId,
      }
      const created = await transaction.marketplaceMatchCandidate.create({
        data: {
          matchRunId: run.id,
          providerProfileId: candidate.providerProfileId,
          projectionId: candidate.projection.id,
          status,
          rank: candidate.result.status === 'ELIGIBLE' ? rank : null,
          scoreNumerator: candidate.result.scoreNumerator,
          scoreDenominator: candidate.result.scoreDenominator,
          normalizedScore: candidate.result.normalizedScore,
          exclusionReasons: candidate.result.exclusionReasons,
          explanation: { factors: candidate.result.factors } as Prisma.InputJsonValue,
          tieBreaker: { hash: candidate.result.tieBreakerHash } as Prisma.InputJsonValue,
          providerSnapshot: providerSnapshot as Prisma.InputJsonValue,
          snapshotChecksum: hashProviderJson(asCanonical(providerSnapshot)).sha256,
        },
        select: { id: true, providerProfileId: true, status: true, rank: true },
      })
      candidateRecords.push(created)
    }

    const selected = candidateRecords.filter((candidate) => candidate.status === 'SELECTED').sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    const invitations = []
    for (const selectedCandidate of selected) {
      const projection = latestByProvider.get(selectedCandidate.providerProfileId)!
      const invitationSnapshot = {
        assignmentId: assignment.id,
        assignmentVersion: assignment.version,
        matchRunId: run.id,
        matchCandidateId: selectedCandidate.id,
        providerProfileId: selectedCandidate.providerProfileId,
        deadlineAt: assignment.responseDeadline.toISOString(),
        creditCost: MARKETPLACE_CREDIT_COST,
      }
      const invitation = await transaction.providerInvitation.create({
        data: {
          assignmentId: assignment.id,
          matchRunId: run.id,
          matchCandidateId: selectedCandidate.id,
          providerProfileId: selectedCandidate.providerProfileId,
          providerOrganizationId: projection.providerProfile.organizationId,
          creditCost: MARKETPLACE_CREDIT_COST,
          deadlineAt: assignment.responseDeadline,
          snapshot: invitationSnapshot as Prisma.InputJsonValue,
          snapshotChecksum: hashProviderJson(asCanonical(invitationSnapshot)).sha256,
          idempotencyKey: `INVITE:${assignment.id}:${selectedCandidate.providerProfileId}`,
        },
        select: { id: true, providerOrganizationId: true },
      })
      const selectedEvaluation = evaluated.find((candidate) => candidate.providerProfileId === selectedCandidate.providerProfileId)!
      await transaction.assignmentProviderSelection.upsert({
        where: { assignmentId_providerProfileId: { assignmentId: assignment.id, providerProfileId: selectedCandidate.providerProfileId } },
        create: {
          assignmentId: assignment.id,
          providerProfileId: selectedCandidate.providerProfileId,
          source: 'AUTOMATIC',
          status: 'INVITED',
          score: (selectedEvaluation.result.normalizedScore ?? 0) / 100,
          scoreDetails: { matchRunId: run.id, matchCandidateId: selectedCandidate.id, explanation: selectedEvaluation.result.factors },
          selectedByUserId: input.actorUserId,
        },
        update: {},
      })
      invitations.push(invitation)
      const recipients = await activeOrganizationRecipients(transaction, invitation.providerOrganizationId)
      for (const recipientUserId of recipients) {
        const eventId = `INVITATION:${invitation.id}`
        await createMarketplaceNotification(transaction, {
          recipientUserId,
          eventId,
          type: 'INVITATION_RECEIVED',
          title: 'Nieuwe uitnodiging',
          body: 'Uw organisatie is uitgenodigd om een offerte uit te brengen.',
          targetRoute: `/uitnodigingen/${invitation.id}`,
        })
        await enqueueMarketplaceEmail(transaction, { eventId, recipientUserId, templateKey: 'MARKETPLACE_INVITATION', payload: { invitationId: invitation.id } })
      }
    }
    const report = {
      selectedCount: selected.length,
      eligibleCount: ranked.length,
      candidateCount: evaluated.length,
      selectedProviderProfileIds: selected.map((candidate) => candidate.providerProfileId),
      confidenceLevel,
      confidenceReasons,
      versions: {
        engine: MARKETPLACE_ENGINE_VERSION,
        model: MARKETPLACE_MODEL_VERSION,
        rules: MARKETPLACE_RULE_VERSION,
        taxonomy: MARKETPLACE_TAXONOMY_CONTRACT,
      },
    }
    const decisionChecksum = hashProviderJson(asCanonical(report)).sha256
    await transaction.marketplaceMatchRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: now, decisionReport: report as Prisma.InputJsonValue, decisionChecksum },
    })
    await transaction.assignment.update({
      where: { id: assignment.id },
      data: { status: selected.length > 0 ? 'AWAITING_RESPONSES' : 'MATCHING', version: { increment: 1 } },
    })
    await transaction.assignmentStatusHistory.create({
      data: {
        assignmentId: assignment.id,
        fromStatus: 'OPEN',
        toStatus: selected.length > 0 ? 'AWAITING_RESPONSES' : 'MATCHING',
        changedByUserId: input.actorUserId,
        reason: selected.length > 0 ? 'Selectie afgerond en uitnodigingen aangemaakt.' : 'Geen geschikte aanbieders gevonden.',
      },
    })
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: membership.role,
      organizationId: input.organizationId,
      action: 'MATCH_COMPLETED',
      entityType: 'MarketplaceMatchRun',
      entityId: run.id,
      previousState: 'RUNNING',
      nextState: 'COMPLETED',
      correlationKey: input.idempotencyKey,
      metadata: { selectedCount: selected.length, candidateCount: evaluated.length },
    })
    return transaction.marketplaceMatchRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { candidates: { orderBy: { rank: 'asc' } }, invitations: true },
    })
  }, { isolationLevel: 'Serializable' })
}

export async function applyMarketplaceMatchIntervention(input: {
  actorUserId: string
  matchRunId: string
  candidateIds: string[]
  reason: string
  idempotencyKey: string
  now?: Date
}) {
  if (input.reason.trim().length < 10 || input.candidateIds.length < 1 || input.candidateIds.length > MARKETPLACE_MAX_SELECTIONS) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  if (new Set(input.candidateIds).size !== input.candidateIds.length) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const now = input.now ?? new Date()
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.marketplaceAuditEvent.findUnique({ where: { correlationKey: input.idempotencyKey } })
    if (repeated) return repeated
    await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
    const run = await transaction.marketplaceMatchRun.findFirst({
      where: { id: input.matchRunId, status: 'COMPLETED' },
      include: {
        assignment: { select: { id: true, responseDeadline: true, status: true } },
        candidates: {
          where: { id: { in: input.candidateIds }, status: { in: ['ELIGIBLE', 'SELECTED'] } },
          include: { providerProfile: { select: { organizationId: true, selectabilityStatus: true, lifecycleStatus: true } } },
        },
        invitations: { select: { id: true, matchCandidateId: true, providerProfileId: true, providerOrganizationId: true, status: true, participation: { select: { id: true } } } },
      },
    })
    if (!run || run.candidates.length !== input.candidateIds.length) throw new MarketplaceServiceError('NOT_FOUND')
    if (!run.assignment.responseDeadline || run.assignment.responseDeadline <= now || !['MATCHING', 'AWAITING_RESPONSES'].includes(run.assignment.status)) {
      throw new MarketplaceServiceError('INVALID_STATE')
    }
    if (run.invitations.some((invitation) => invitation.participation || invitation.status === 'ACCEPTED')) {
      throw new MarketplaceServiceError('INVALID_STATE')
    }
    if (run.candidates.some((candidate) => candidate.providerProfile.selectabilityStatus !== 'SELECTABLE' || candidate.providerProfile.lifecycleStatus !== 'QUALIFIED')) {
      throw new MarketplaceServiceError('NOT_SELECTABLE')
    }
    const replacementIds = new Set(run.candidates.map((candidate) => candidate.providerProfileId))
    const currentInvitations = run.invitations.filter((invitation) => invitation.status === 'INVITED')
    const originalSelection = currentInvitations.map((invitation) => ({ invitationId: invitation.id, providerProfileId: invitation.providerProfileId }))
    const replacementSelection = run.candidates.map((candidate) => ({ candidateId: candidate.id, providerProfileId: candidate.providerProfileId }))
    const intervention = await transaction.marketplaceMatchIntervention.create({
      data: {
        matchRunId: run.id,
        actorUserId: input.actorUserId,
        reason: input.reason.trim(),
        originalSelection,
        replacementSelection,
      },
    })
    for (const invitation of currentInvitations) {
      if (replacementIds.has(invitation.providerProfileId)) continue
      await transaction.providerInvitation.update({ where: { id: invitation.id }, data: { status: 'WITHDRAWN', withdrawnAt: now } })
      await transaction.assignmentProviderSelection.updateMany({
        where: { assignmentId: run.assignment.id, providerProfileId: invitation.providerProfileId, status: 'INVITED' },
        data: { status: 'REMOVED', removedAt: now },
      })
    }
    for (const candidate of run.candidates) {
      const currentInvitation = currentInvitations.find((invitation) => invitation.providerProfileId === candidate.providerProfileId)
      if (currentInvitation) continue
      const historicalInvitation = run.invitations.find((invitation) => invitation.providerProfileId === candidate.providerProfileId)
      if (historicalInvitation) throw new MarketplaceServiceError('INVALID_STATE')
      const invitationSnapshot = {
        assignmentId: run.assignment.id,
        assignmentVersion: run.assignmentVersion,
        matchRunId: run.id,
        matchCandidateId: candidate.id,
        providerProfileId: candidate.providerProfileId,
        deadlineAt: run.assignment.responseDeadline.toISOString(),
        creditCost: MARKETPLACE_CREDIT_COST,
        interventionId: intervention.id,
      }
      const invitation = await transaction.providerInvitation.create({
        data: {
          assignmentId: run.assignment.id,
          matchRunId: run.id,
          matchCandidateId: candidate.id,
          providerProfileId: candidate.providerProfileId,
          providerOrganizationId: candidate.providerProfile.organizationId,
          creditCost: MARKETPLACE_CREDIT_COST,
          deadlineAt: run.assignment.responseDeadline,
          snapshot: invitationSnapshot as Prisma.InputJsonValue,
          snapshotChecksum: hashProviderJson(asCanonical(invitationSnapshot)).sha256,
          idempotencyKey: `INTERVENTION_INVITE:${run.id}:${candidate.providerProfileId}`,
        },
      })
      await transaction.assignmentProviderSelection.upsert({
        where: { assignmentId_providerProfileId: { assignmentId: run.assignment.id, providerProfileId: candidate.providerProfileId } },
        create: {
          assignmentId: run.assignment.id,
          providerProfileId: candidate.providerProfileId,
          source: 'MANUAL_ADMIN',
          status: 'INVITED',
          score: candidate.normalizedScore === null ? null : candidate.normalizedScore / 100,
          scoreDetails: { matchRunId: run.id, matchCandidateId: candidate.id, interventionId: intervention.id },
          selectedByUserId: input.actorUserId,
        },
        update: { source: 'MANUAL_ADMIN', status: 'INVITED', removedAt: null, selectedByUserId: input.actorUserId },
      })
      for (const recipientUserId of await activeOrganizationRecipients(transaction, candidate.providerProfile.organizationId)) {
        const eventId = `INVITATION:${invitation.id}`
        await createMarketplaceNotification(transaction, {
          recipientUserId,
          eventId,
          type: 'INVITATION_RECEIVED',
          title: 'Nieuwe uitnodiging',
          body: 'Uw organisatie is uitgenodigd om een offerte uit te brengen.',
          targetRoute: `/uitnodigingen/${invitation.id}`,
        })
        await enqueueMarketplaceEmail(transaction, { eventId, recipientUserId, templateKey: 'MARKETPLACE_INVITATION', payload: { invitationId: invitation.id } })
      }
    }
    return writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: 'PLATFORM_ADMIN',
      action: 'MATCH_SELECTION_INTERVENED',
      entityType: 'MarketplaceMatchIntervention',
      entityId: intervention.id,
      previousState: 'ORIGINAL_SELECTION',
      nextState: 'REPLACEMENT_SELECTION',
      reason: input.reason.trim(),
      correlationKey: input.idempotencyKey,
      metadata: { matchRunId: run.id, originalSelection, replacementSelection },
    })
  }, { isolationLevel: 'Serializable' })
}
