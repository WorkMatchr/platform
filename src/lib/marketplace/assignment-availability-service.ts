import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  hashProviderJson,
  type CanonicalValue,
} from '@/lib/providers/provider-canonical-json'
import {
  MARKETPLACE_ENGINE_VERSION,
  MARKETPLACE_MODEL_VERSION,
  MARKETPLACE_RULE_VERSION,
  MARKETPLACE_TAXONOMY_CONTRACT,
} from './marketplace-config'
import {
  evaluateMatchingCandidate,
  rankMatchingCandidates,
  type MatchingProviderFacts,
  type MatchingRuleResult,
} from './matching-rules'

type Transaction = Prisma.TransactionClient

export const MARKETPLACE_AVAILABILITY_FLOW_VERSION = 'ASSIGNMENT-ELIGIBILITY-1'
export const MARKETPLACE_ELIGIBILITY_BATCH_SIZE = 250

type TrustedPayload = Pick<
  MatchingProviderFacts,
  'capabilities' | 'sectors' | 'workAreas'
>

type SpecialismCriterion = Readonly<{
  specialismId: string
  code: string
  label: string
}>

type ProjectionCandidate = Readonly<{
  providerProfileId: string
  projectionId: string
  projectionChecksum: string
  projectionSourceVersion: number
  projectionSchemaVersion: number
  providerOrganizationId: string
  payload: TrustedPayload | null
}>

export type AggregatedEligibility = Readonly<{
  result: MatchingRuleResult
  matchedSpecialisms: Array<{
    specialismId: string
    code: string
    label: string
  }>
  evaluatedSpecialisms: Array<{
    specialismId: string
    code: string
    label: string
    status: MatchingRuleResult['status']
    exclusionReasons: string[]
    normalizedScore: number | null
  }>
}>

export function evaluateAssignmentPopulation(input: {
  assignmentId: string
  criteria: readonly SpecialismCriterion[]
  sectorCode: string | null
  regionCode: string | null
  allowsRemoteWork: boolean
  candidates: readonly ProjectionCandidate[]
}) {
  const evaluated = input.candidates.map((candidate) => ({
    ...candidate,
    eligibility: evaluateProviderForAssignment({
      assignmentId: input.assignmentId,
      criteria: input.criteria,
      sectorCode: input.sectorCode,
      regionCode: input.regionCode,
      allowsRemoteWork: input.allowsRemoteWork,
      provider: candidate.payload
        ? { providerProfileId: candidate.providerProfileId, ...candidate.payload }
        : null,
      providerProfileId: candidate.providerProfileId,
    }),
  }))
  const ranked = rankMatchingCandidates(
    evaluated.map((candidate) => ({
      providerProfileId: candidate.providerProfileId,
      result: candidate.eligibility.result,
    })),
  )
  return { evaluated, ranked }
}

function asCanonical(value: unknown): CanonicalValue {
  return JSON.parse(JSON.stringify(value)) as CanonicalValue
}

export function readTrustedProviderPayload(value: Prisma.JsonValue): TrustedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  if (
    !Array.isArray(source.capabilities) ||
    !Array.isArray(source.sectors) ||
    !Array.isArray(source.workAreas)
  ) return null

  const capabilities = source.capabilities.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    if (
      typeof record.serviceCode !== 'string' ||
      !Array.isArray(record.deliveryModes)
    ) return []
    return [{
      serviceCode: record.serviceCode,
      specialismCode:
        typeof record.specialismCode === 'string'
          ? record.specialismCode
          : null,
      deliveryModes: record.deliveryModes.filter(
        (mode): mode is string => typeof mode === 'string',
      ),
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
  return capabilities.length > 0 && workAreas.length > 0
    ? { capabilities, sectors, workAreas }
    : null
}

export function normalizeMarketplaceRegion(value: string | null | undefined) {
  return value?.trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_') ?? null
}

function unreadableProjectionResult(
  assignmentId: string,
  providerProfileId: string,
): MatchingRuleResult {
  return {
    status: 'EXCLUDED',
    exclusionReasons: ['PROVIDERPROJECTIE_ONLEESBAAR'],
    scoreNumerator: null,
    scoreDenominator: null,
    normalizedScore: null,
    factors: [],
    tieBreakerHash: hashProviderJson(
      asCanonical({ assignmentId, providerProfileId }),
    ).sha256,
  }
}

export function evaluateProviderForAssignment(input: {
  assignmentId: string
  criteria: readonly SpecialismCriterion[]
  sectorCode: string | null
  regionCode: string | null
  allowsRemoteWork: boolean
  provider: MatchingProviderFacts | null
  providerProfileId: string
}): AggregatedEligibility {
  if (!input.provider) {
    return {
      result: unreadableProjectionResult(
        input.assignmentId,
        input.providerProfileId,
      ),
      matchedSpecialisms: [],
      evaluatedSpecialisms: input.criteria.map((criterion) => ({
        ...criterion,
        status: 'EXCLUDED' as const,
        exclusionReasons: ['PROVIDERPROJECTIE_ONLEESBAAR'],
        normalizedScore: null,
      })),
    }
  }

  const evaluations = input.criteria.map((criterion) => ({
    criterion,
    result: evaluateMatchingCandidate({
      assignmentId: input.assignmentId,
      capabilityCode: criterion.code,
      sectorCode: input.sectorCode,
      regionCode: input.regionCode,
      allowsRemoteWork: input.allowsRemoteWork,
    }, input.provider!),
  }))
  const eligible = evaluations
    .filter((evaluation) => evaluation.result.status === 'ELIGIBLE')
    .sort((left, right) =>
      (right.result.normalizedScore ?? 0) -
      (left.result.normalizedScore ?? 0),
    )
  const representative = eligible[0]?.result ?? {
    ...evaluations[0]!.result,
    exclusionReasons: [
      ...new Set(
        evaluations.flatMap(
          (evaluation) => evaluation.result.exclusionReasons,
        ),
      ),
    ],
  }

  return {
    result: representative,
    matchedSpecialisms: eligible.map(({ criterion }) => criterion),
    evaluatedSpecialisms: evaluations.map(({ criterion, result }) => ({
      ...criterion,
      status: result.status,
      exclusionReasons: result.exclusionReasons,
      normalizedScore: result.normalizedScore,
    })),
  }
}

export async function createAssignmentAvailabilityEvent(
  transaction: Transaction,
  input: {
    assignmentId: string
    publishedVersion: number
    createdAt: Date
  },
) {
  return transaction.marketplaceAssignmentAvailability.create({
    data: {
      assignmentId: input.assignmentId,
      publishedVersion: input.publishedVersion,
      flowVersion: MARKETPLACE_AVAILABILITY_FLOW_VERSION,
      idempotencyKey:
        `ASSIGNMENT_AVAILABLE:${input.assignmentId}:${input.publishedVersion}`,
      createdAt: input.createdAt,
    },
    select: { id: true },
  })
}

function safeProcessingErrorCode(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^P\d{4}$/.test(error.code)
  ) return error.code
  if (error instanceof Error && error.message === 'SPECIALISM_MAPPING_MISSING') {
    return 'SPECIALISM_MAPPING_MISSING'
  }
  return 'ELIGIBILITY_PROCESSING_FAILED'
}

export async function processAssignmentAvailability(assignmentId: string) {
  const prisma = getPrisma()
  try {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "MarketplaceAssignmentAvailability"
        WHERE "assignmentId" = ${assignmentId}::uuid
        FOR UPDATE
      `
      const event = await transaction.marketplaceAssignmentAvailability.findUnique({
        where: { assignmentId },
      })
      if (!event) return null
      if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
        return event
      }

      const now = new Date()
      const assignment = await transaction.assignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          status: true,
          version: true,
          publishedVersion: true,
          publishedByUserId: true,
          sectorId: true,
          allowsRemoteWork: true,
          locationProvince: true,
          location: { select: { province: true } },
          maxSelections: true,
          primarySpecialismId: true,
          specialisms: {
            where: { isRequired: true },
            select: {
              specialismId: true,
              specialism: { select: { name: true } },
            },
          },
        },
      })
      const activeStatuses = new Set([
        'OPEN',
        'MATCHING',
        'AWAITING_RESPONSES',
        'IN_SELECTION',
      ])
      if (
        !assignment ||
        !activeStatuses.has(assignment.status) ||
        assignment.publishedVersion !== event.publishedVersion ||
        !assignment.publishedByUserId
      ) {
        return transaction.marketplaceAssignmentAvailability.update({
          where: { id: event.id },
          data: {
            status: 'CANCELLED',
            attemptCount: { increment: 1 },
            processingStartedAt: now,
            completedAt: now,
            lastErrorCode: null,
          },
        })
      }

      await transaction.marketplaceAssignmentAvailability.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSING',
          attemptCount: { increment: 1 },
          processingStartedAt: now,
          completedAt: null,
          lastErrorCode: null,
        },
      })

      const specialismIds = [
        assignment.primarySpecialismId,
        ...assignment.specialisms.map((item) => item.specialismId),
      ].filter((value): value is string => Boolean(value))
      const uniqueSpecialismIds = [...new Set(specialismIds)]
      if (uniqueSpecialismIds.length === 0) {
        throw new Error('SPECIALISM_MAPPING_MISSING')
      }
      const mappings = await transaction.providerSpecialismTaxonomyMap.findMany({
        where: { specialismId: { in: uniqueSpecialismIds } },
        select: {
          specialismId: true,
          term: { select: { code: true } },
          specialism: { select: { name: true } },
        },
      })
      if (mappings.length !== uniqueSpecialismIds.length) {
        throw new Error('SPECIALISM_MAPPING_MISSING')
      }
      const criteria: SpecialismCriterion[] = mappings
        .map((mapping) => ({
          specialismId: mapping.specialismId,
          code: mapping.term.code,
          label: mapping.specialism.name,
        }))
        .sort((left, right) => left.code.localeCompare(right.code, 'en'))
      const sectorMapping = assignment.sectorId
        ? await transaction.providerSectorTaxonomyMap.findUnique({
          where: { sectorId: assignment.sectorId },
          select: { term: { select: { code: true } } },
        })
        : null
      const regionCode = normalizeMarketplaceRegion(
        assignment.locationProvince ?? assignment.location?.province,
      )
      const assignmentSnapshot = {
        assignmentId: assignment.id,
        assignmentVersion: assignment.version,
        publishedVersion: assignment.publishedVersion,
        flowVersion: event.flowVersion,
        specialisms: criteria,
        sectorCode: sectorMapping?.term.code ?? null,
        regionCode,
        allowsRemoteWork: assignment.allowsRemoteWork,
        maxSelections: assignment.maxSelections,
        maxSelectionsUsedAsEligibilityLimit: false,
      }
      const inputChecksum = hashProviderJson(
        asCanonical(assignmentSnapshot),
      ).sha256
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
            organization: {
              status: 'ACTIVE',
              organizationType: { in: ['PROVIDER', 'BOTH'] },
              systemKey: null,
            },
            blocks: { none: { release: null } },
          },
        },
        orderBy: [
          { providerProfileId: 'asc' },
          { sourceVersion: 'desc' },
        ],
        select: {
          id: true,
          providerProfileId: true,
          payload: true,
          sha256: true,
          sourceVersion: true,
          schemaVersion: true,
          providerProfile: { select: { organizationId: true } },
        },
      })
      const latestByProvider = new Map<string, ProjectionCandidate>()
      for (const projection of projections) {
        if (latestByProvider.has(projection.providerProfileId)) continue
        latestByProvider.set(projection.providerProfileId, {
          providerProfileId: projection.providerProfileId,
          projectionId: projection.id,
          projectionChecksum: projection.sha256,
          projectionSourceVersion: projection.sourceVersion,
          projectionSchemaVersion: projection.schemaVersion,
          providerOrganizationId: projection.providerProfile.organizationId,
          payload: readTrustedProviderPayload(projection.payload),
        })
      }
      const { evaluated, ranked } = evaluateAssignmentPopulation({
        assignmentId: assignment.id,
        criteria,
        sectorCode: sectorMapping?.term.code ?? null,
        regionCode,
        allowsRemoteWork: assignment.allowsRemoteWork,
        candidates: [...latestByProvider.values()],
      })
      const rankByProvider = new Map(
        ranked.map((candidate, index) => [candidate.providerProfileId, index + 1]),
      )
      const confidenceReasons: string[] = []
      if (evaluated.length < 3) confidenceReasons.push('BEPERKT_KANDIDAATVOLUME')
      if (evaluated.length === 0) {
        confidenceReasons.push('GEEN_GELDIGE_PROVIDERPROJECTIES')
      }
      const confidenceLevel = confidenceReasons.length === 0 ? 'HOOG' : 'LAAG'
      const run = await transaction.marketplaceMatchRun.create({
        data: {
          assignmentId: assignment.id,
          assignmentVersion: assignment.version,
          engineVersion: MARKETPLACE_ENGINE_VERSION,
          modelVersion: MARKETPLACE_MODEL_VERSION,
          ruleVersion: MARKETPLACE_RULE_VERSION,
          taxonomyVersion: MARKETPLACE_TAXONOMY_CONTRACT,
          startedByUserId: assignment.publishedByUserId,
          idempotencyKey: `ELIGIBILITY:${event.id}`,
          confidenceLevel,
          confidenceReasons,
          assignmentSnapshot: assignmentSnapshot as Prisma.InputJsonValue,
          inputChecksum,
        },
        select: { id: true },
      })

      const candidateData = evaluated.map((candidate) => {
        const result = candidate.eligibility.result
        const providerSnapshot = {
          providerProfileId: candidate.providerProfileId,
          providerOrganizationId: candidate.providerOrganizationId,
          projectionId: candidate.projectionId,
          projectionChecksum: candidate.projectionChecksum,
          projectionSourceVersion: candidate.projectionSourceVersion,
          projectionSchemaVersion: candidate.projectionSchemaVersion,
        }
        return {
            matchRunId: run.id,
            providerProfileId: candidate.providerProfileId,
            projectionId: candidate.projectionId,
            status: result.status,
            rank:
              result.status === 'ELIGIBLE'
                ? rankByProvider.get(candidate.providerProfileId)
                : null,
            scoreNumerator: result.scoreNumerator,
            scoreDenominator: result.scoreDenominator,
            normalizedScore: result.normalizedScore,
            exclusionReasons: result.exclusionReasons,
            explanation: {
              factors: result.factors,
              matchedSpecialisms: candidate.eligibility.matchedSpecialisms,
              evaluatedSpecialisms:
                candidate.eligibility.evaluatedSpecialisms,
              canonicalRecipientIdentifier: {
                type: 'PROVIDER_PROFILE',
                providerProfileId: candidate.providerProfileId,
                providerOrganizationId: candidate.providerOrganizationId,
              },
              workset2RecipientTranslation:
                'Vertaal providerOrganizationId naar actieve professionele memberships; ProviderProfessional heeft nog geen betrouwbare User-binding.',
            } as Prisma.InputJsonValue,
            tieBreaker: {
              hash: result.tieBreakerHash,
            } as Prisma.InputJsonValue,
            providerSnapshot: providerSnapshot as Prisma.InputJsonValue,
            snapshotChecksum: hashProviderJson(
              asCanonical(providerSnapshot),
            ).sha256,
          } satisfies Prisma.MarketplaceMatchCandidateCreateManyInput
      })
      for (
        let offset = 0;
        offset < candidateData.length;
        offset += MARKETPLACE_ELIGIBILITY_BATCH_SIZE
      ) {
        await transaction.marketplaceMatchCandidate.createMany({
          data: candidateData.slice(
            offset,
            offset + MARKETPLACE_ELIGIBILITY_BATCH_SIZE,
          ),
        })
      }

      const eligibleCount = evaluated.filter(
        (candidate) => candidate.eligibility.result.status === 'ELIGIBLE',
      ).length
      const notEligibleCount = evaluated.length - eligibleCount
      const report = {
        flowVersion: event.flowVersion,
        availabilityEventId: event.id,
        population: {
          providerProjectionCount: evaluated.length,
          providerProfileIds: evaluated.map(
            (candidate) => candidate.providerProfileId,
          ),
        },
        evaluatedCount: evaluated.length,
        eligibleCount,
        notEligibleCount,
        rankedEligibleProviderProfileIds: ranked.map(
          (candidate) => candidate.providerProfileId,
        ),
        maxSelectionsUsedAsEligibilityLimit: false,
        versions: {
          engine: MARKETPLACE_ENGINE_VERSION,
          model: MARKETPLACE_MODEL_VERSION,
          rules: MARKETPLACE_RULE_VERSION,
          taxonomy: MARKETPLACE_TAXONOMY_CONTRACT,
        },
        evaluatedAt: now.toISOString(),
      }
      await transaction.marketplaceMatchRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          decisionReport: report as Prisma.InputJsonValue,
          decisionChecksum: hashProviderJson(asCanonical(report)).sha256,
        },
      })
      return transaction.marketplaceAssignmentAvailability.update({
        where: { id: event.id },
        data: {
          status: 'COMPLETED',
          matchRunId: run.id,
          candidatesEvaluated: evaluated.length,
          eligibleCount,
          notEligibleCount,
          completedAt: now,
          lastErrorCode: null,
        },
      })
    }, { isolationLevel: 'Serializable' })

    if (result) {
      console.info('[marketplace-eligibility] verwerking afgerond', {
        assignmentId,
        availabilityEventId: result.id,
        matchRunId: result.matchRunId,
        candidatesEvaluated: result.candidatesEvaluated,
        eligibleCount: result.eligibleCount,
        notEligibleCount: result.notEligibleCount,
        processingStatus: result.status,
        error: result.lastErrorCode,
      })
    }
    return result
  } catch (error) {
    const errorCode = safeProcessingErrorCode(error)
    const failed = await prisma.marketplaceAssignmentAvailability.updateMany({
      where: {
        assignmentId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      data: {
        status: 'FAILED',
        attemptCount: { increment: 1 },
        lastErrorCode: errorCode,
      },
    })
    console.error('[marketplace-eligibility] verwerking mislukt', {
      assignmentId,
      processingStatus: 'FAILED',
      error: errorCode,
      eventUpdated: failed.count === 1,
    })
    throw error
  }
}

export async function processAssignmentAvailabilityFailSafe(
  assignmentId: string,
) {
  try {
    return await processAssignmentAvailability(assignmentId)
  } catch {
    return null
  }
}
