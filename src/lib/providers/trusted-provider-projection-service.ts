import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { hashProviderJson, type CanonicalValue } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'

const PROJECTION_SCHEMA_VERSION = 2
const CANONICALIZATION_VERSION = 'WORKMATCHR-CJ-1'
const NO_SCHEDULED_EXPIRY = new Date('9999-12-31T23:59:59.999Z')

type ProjectionSource = {
  providerProfileId: string
  sourceVersion: number
  taxonomyVersions: Array<{ kind: string; version: number; checksum: string }>
  capabilities: Array<{
    serviceCode: string
    specialismCode: string | null
    competencyCode: string | null
    deliveryModes: string[]
    verificationLevel: string
  }>
  sectors: Array<{ sectorCode: string; verificationLevel: string }>
  workAreas: Array<{ regionCode: string; maxTravelDistanceKm: number | null; verificationLevel: string }>
  platformQualificationDecisionId: string
}

export function buildTrustedProviderPayload(source: ProjectionSource): CanonicalValue {
  return {
    capabilities: source.capabilities
      .map((item) => ({ ...item, deliveryModes: [...item.deliveryModes].sort() }))
      .sort((left, right) => `${left.serviceCode}:${left.specialismCode ?? ''}`.localeCompare(`${right.serviceCode}:${right.specialismCode ?? ''}`, 'en')),
    platformQualificationDecisionId: source.platformQualificationDecisionId,
    providerProfileId: source.providerProfileId,
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    sectors: [...source.sectors].sort((left, right) => left.sectorCode.localeCompare(right.sectorCode, 'en')),
    sourceVersion: source.sourceVersion,
    taxonomyVersions: [...source.taxonomyVersions].sort((left, right) => left.kind.localeCompare(right.kind, 'en')),
    workAreas: [...source.workAreas].sort((left, right) => left.regionCode.localeCompare(right.regionCode, 'en')),
  }
}

function currentVerification<T extends { verificationReviews: Array<{ resultingLevel: string }> }>(revision: T) {
  return revision.verificationReviews[0]?.resultingLevel ?? 'SELF_DECLARED'
}

export async function createTrustedProviderProjection(providerProfileId: string, createdByUserId?: string, at = new Date()) {
  return getPrisma().$transaction(
    async (transaction) => {
      const provider = await transaction.providerProfile.findFirst({
        where: { id: providerProfileId, archivedAt: null, selectabilityStatus: 'SELECTABLE' },
        select: {
          id: true,
          version: true,
          readinessAssessments: { where: { status: 'READY' }, orderBy: { createdAt: 'desc' }, take: 1 },
          selectabilityAssessments: { where: { status: 'SELECTABLE' }, orderBy: { createdAt: 'desc' }, take: 1 },
          qualificationDecisions: { where: { scope: 'PLATFORM', outcome: { in: ['QUALIFIED', 'RESTORED'] }, validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, orderBy: { createdAt: 'desc' }, take: 1 },
          capabilities: {
            where: { status: 'ACTIVE', qualificationDecisions: { some: { outcome: { in: ['QUALIFIED', 'RESTORED'] }, validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] } } },
            select: {
              qualificationDecisions: { where: { outcome: { in: ['QUALIFIED', 'RESTORED'] }, validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, orderBy: { createdAt: 'desc' }, take: 1, select: { validUntil: true } },
              revisions: { orderBy: { version: 'desc' }, take: 1, include: { serviceTerm: true, specialismTerm: true, competencyTerm: true, verificationReviews: { where: { validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, orderBy: { createdAt: 'desc' }, take: 1 } } },
            },
          },
          sectorExperiences: { where: { status: 'ACTIVE' }, select: { revisions: { orderBy: { version: 'desc' }, take: 1, include: { sectorTerm: true, verificationReviews: { where: { validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, orderBy: { createdAt: 'desc' }, take: 1 } } } } },
          workAreas: { where: { status: 'ACTIVE' }, select: { revisions: { orderBy: { version: 'desc' }, take: 1, include: { regionTerm: true, verificationReviews: { where: { validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, orderBy: { createdAt: 'desc' }, take: 1 } } } } },
        },
      })
      const readiness = provider?.readinessAssessments[0]
      const selectability = provider?.selectabilityAssessments[0]
      const platformDecision = provider?.qualificationDecisions[0]
      if (
        !provider ||
        !readiness ||
        !selectability ||
        !platformDecision ||
        readiness.sourceVersion !== provider.version ||
        selectability.sourceVersion !== provider.version
      ) {
        throw new ProviderServiceError('PROJECTION_NOT_ALLOWED')
      }
      const taxonomyVersions = await transaction.providerTaxonomyVersion.findMany({
        where: { status: 'PUBLISHED', checksum: { not: null } },
        select: { version: true, checksum: true, taxonomy: { select: { kind: true } } },
      })
      const capabilities = provider.capabilities.flatMap((item) => item.revisions).filter((revision) => revision.serviceTerm && currentVerification(revision) !== 'SELF_DECLARED')
      const sectors = provider.sectorExperiences.flatMap((item) => item.revisions).filter((revision) => currentVerification(revision) !== 'SELF_DECLARED')
      const workAreas = provider.workAreas.flatMap((item) => item.revisions).filter((revision) => currentVerification(revision) !== 'SELF_DECLARED')
      if (capabilities.length === 0 || workAreas.length === 0) throw new ProviderServiceError('PROJECTION_NOT_ALLOWED')

      const payload = buildTrustedProviderPayload({
        providerProfileId,
        sourceVersion: provider.version,
        taxonomyVersions: taxonomyVersions.map((item) => ({ kind: item.taxonomy.kind, version: item.version, checksum: item.checksum! })),
        capabilities: capabilities.map((revision) => ({
          serviceCode: revision.serviceTerm!.code,
          specialismCode: revision.specialismTerm?.code ?? null,
          competencyCode: revision.competencyTerm?.code ?? null,
          deliveryModes: revision.deliveryModes,
          verificationLevel: currentVerification(revision),
        })),
        sectors: sectors.map((revision) => ({ sectorCode: revision.sectorTerm.code, verificationLevel: currentVerification(revision) })),
        workAreas: workAreas.map((revision) => ({ regionCode: revision.regionTerm.code, maxTravelDistanceKm: revision.maxTravelDistanceKm, verificationLevel: currentVerification(revision) })),
        platformQualificationDecisionId: platformDecision.id,
      })
      const sourceExpiries = [
        platformDecision.validUntil,
        ...provider.capabilities.flatMap((item) => item.qualificationDecisions.map((decision) => decision.validUntil)),
        ...provider.capabilities.flatMap((item) => item.revisions.flatMap((revision) => revision.verificationReviews.map((review) => review.validUntil))),
        ...provider.sectorExperiences.flatMap((item) => item.revisions.flatMap((revision) => revision.verificationReviews.map((review) => review.validUntil))),
        ...provider.workAreas.flatMap((item) => item.revisions.flatMap((revision) => revision.verificationReviews.map((review) => review.validUntil))),
      ].filter((value): value is Date => value !== null)
      const validUntil = sourceExpiries.length > 0
        ? new Date(Math.min(...sourceExpiries.map((value) => value.getTime())))
        : NO_SCHEDULED_EXPIRY
      const { sha256 } = hashProviderJson(payload)
      const existing = await transaction.trustedProviderProjection.findUnique({
        where: { providerProfileId_sourceVersion: { providerProfileId, sourceVersion: provider.version } },
        select: { id: true, sha256: true },
      })
      if (existing) {
        if (existing.sha256 !== sha256) throw new ProviderServiceError('CONFLICT')
        return { ...existing, idempotent: true }
      }
      const projection = await transaction.trustedProviderProjection.create({
        data: {
          providerProfileId,
          readinessAssessmentId: readiness.id,
          selectabilityAssessmentId: selectability.id,
          schemaVersion: PROJECTION_SCHEMA_VERSION,
          canonicalizationVersion: CANONICALIZATION_VERSION,
          sourceVersion: provider.version,
          payload: payload as Prisma.InputJsonValue,
          sha256,
          validFrom: at,
          validUntil,
          createdByUserId,
        },
        select: { id: true, sha256: true },
      })
      return { ...projection, idempotent: false }
    },
    { isolationLevel: 'Serializable' },
  )
}
