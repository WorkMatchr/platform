import type { Prisma } from '@/generated/prisma/client'
import { evaluateMatchingCandidate } from '@/lib/marketplace/matching-rules'
import { MARKETPLACE_RULE_VERSION } from '@/lib/marketplace/marketplace-config'
import { readTrustedProviderPayload } from '@/lib/marketplace/assignment-availability-service'

type Transaction = Prisma.TransactionClient

type ExpertiseTier = Readonly<{
  tier: 'PRIMARY' | 'ADDITIONAL' | 'POSSIBLE'
  label: string
  codes: readonly string[]
}>

type EligibilityRequest = Readonly<{
  id: string
  regionCode: string | null
  sectorCode: string | null
  primaryExpertise: string
  additionalExpertise: readonly string[]
  possibleExpertise: readonly string[]
  primaryExpertiseCodes: readonly string[]
  additionalExpertiseCodes: readonly string[]
  possibleExpertiseCodes: readonly string[]
}>

function expertiseTiers(request: EligibilityRequest): ExpertiseTier[] {
  return [
    {
      tier: 'PRIMARY' as const,
      label: request.primaryExpertise,
      codes: request.primaryExpertiseCodes,
    },
    ...request.additionalExpertise.map((label) => ({
      tier: 'ADDITIONAL' as const,
      label,
      codes: request.additionalExpertiseCodes,
    })),
    ...request.possibleExpertise.map((label) => ({
      tier: 'POSSIBLE' as const,
      label,
      codes: request.possibleExpertiseCodes,
    })),
  ].filter((item) => item.codes.length > 0)
}

export async function createRequestEligibilitySnapshot(
  transaction: Transaction,
  request: EligibilityRequest,
  at: Date,
): Promise<number> {
  const tiers = expertiseTiers(request)
  if (tiers.length === 0) return 0

  const projections = await transaction.trustedProviderProjection.findMany({
    where: {
      validFrom: { lte: at },
      validUntil: { gt: at },
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
      providerProfile: {
        select: { organizationId: true },
      },
    },
  })
  const latestByProvider = new Map<
    string,
    (typeof projections)[number]
  >()
  for (const projection of projections) {
    if (!latestByProvider.has(projection.providerProfileId)) {
      latestByProvider.set(projection.providerProfileId, projection)
    }
  }

  let eligibleCount = 0
  for (const projection of latestByProvider.values()) {
    const payload = readTrustedProviderPayload(projection.payload)
    if (!payload) continue
    const workAreaMatches =
      request.regionCode === null ||
      payload.workAreas.some(
        (area) =>
          area.regionCode === request.regionCode ||
          area.regionCode === 'NATIONWIDE',
      )
    if (!workAreaMatches) continue
    const matches: Array<{
      tier: ExpertiseTier['tier']
      label: string
      capabilityCode: string
    }> = []

    for (const tier of tiers) {
      for (const capabilityCode of tier.codes) {
        const result = evaluateMatchingCandidate(
          {
            assignmentId: request.id,
            capabilityCode,
            sectorCode: request.sectorCode,
            regionCode: request.regionCode,
            allowsRemoteWork: false,
          },
          {
            providerProfileId: projection.providerProfileId,
            ...payload,
          },
        )
        if (result.status === 'ELIGIBLE') {
          matches.push({
            tier: tier.tier,
            label: tier.label,
            capabilityCode,
          })
        }
      }
    }
    if (matches.length === 0) continue

    const matchedExpertise = [
      ...new Set(
        matches.map((match) => `${match.tier}:${match.label}`),
      ),
    ]
    await transaction.requestEligibleProvider.create({
      data: {
        requestId: request.id,
        providerOrganizationId:
          projection.providerProfile.organizationId,
        providerProfileId: projection.providerProfileId,
        projectionId: projection.id,
        matchedExpertise,
        eligibilityBasis: {
          ruleVersion: MARKETPLACE_RULE_VERSION,
          projectionChecksum: projection.sha256,
          projectionSourceVersion: projection.sourceVersion,
          projectionSchemaVersion: projection.schemaVersion,
          requestRegionCode: request.regionCode,
          requestSectorCode: request.sectorCode,
          matches,
        } satisfies Prisma.InputJsonValue,
        createdAt: at,
      },
    })
    eligibleCount += 1
  }
  return eligibleCount
}
