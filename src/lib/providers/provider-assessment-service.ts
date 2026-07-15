import { getPrisma } from '@/lib/prisma'
import { hashProviderJson } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'
import { requirePlatformQualificationBasis } from './provider-requirements'

function errorReason(error: unknown): string {
  return error instanceof ProviderServiceError ? error.code : 'CONFIGURATION_INCOMPLETE'
}

export async function calculateProviderReadiness(providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(async (transaction) => {
    const provider = await transaction.providerProfile.findFirst({
      where: { id: providerProfileId, archivedAt: null, organization: { status: 'ACTIVE' } },
      select: { id: true, version: true },
    })
    if (!provider) throw new ProviderServiceError('NOT_FOUND')
    const reasons: string[] = []
    const [capabilityCount, workAreaCount, capacity] = await Promise.all([
      transaction.providerCapability.count({ where: { providerProfileId, status: 'ACTIVE', revisions: { some: { serviceTermId: { not: null } } } } }),
      transaction.providerWorkArea.count({ where: { providerProfileId, status: 'ACTIVE' } }),
      transaction.providerCapacitySnapshot.findFirst({ where: { providerProfileId }, orderBy: { confirmedAt: 'desc' } }),
    ])
    if (capabilityCount === 0) reasons.push('CAPABILITIES_INCOMPLETE')
    if (workAreaCount === 0) reasons.push('WORK_AREAS_INCOMPLETE')
    if (!capacity || capacity.validUntil <= at) reasons.push('CAPACITY_STALE')
    try {
      await requirePlatformQualificationBasis(transaction, providerProfileId, at)
    } catch (error) {
      reasons.push(errorReason(error))
    }
    const status = reasons.length === 0 ? 'READY' : 'INCOMPLETE'
    const checksum = hashProviderJson({ providerProfileId, providerVersion: provider.version, reasons: [...new Set(reasons)].sort(), status }).sha256
    const assessment = await transaction.providerReadinessAssessment.create({
      data: { providerProfileId, status, reasonCodes: [...new Set(reasons)].sort(), sourceVersion: provider.version, checksum },
      select: { id: true, status: true, reasonCodes: true, checksum: true },
    })
    await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { readinessStatus: status } })
    return assessment
  })
}

export async function calculateProviderSelectability(providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(async (transaction) => {
    const provider = await transaction.providerProfile.findFirst({
      where: { id: providerProfileId, archivedAt: null },
      select: {
        id: true,
        version: true,
        platformQualificationStatus: true,
        readinessAssessments: { orderBy: { createdAt: 'desc' }, take: 1 },
        blocks: { where: { release: null }, select: { id: true } },
        capacitySnapshots: { orderBy: { confirmedAt: 'desc' }, take: 1 },
        capabilities: {
          where: { status: 'ACTIVE' },
          select: { id: true, qualificationDecisions: { where: { outcome: { in: ['QUALIFIED', 'RESTORED'] }, validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, take: 1 } },
        },
      },
    })
    if (!provider) throw new ProviderServiceError('NOT_FOUND')
    const readiness = provider.readinessAssessments[0]
    if (!readiness) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
    const reasons: string[] = []
    if (readiness.status !== 'READY' || readiness.sourceVersion !== provider.version) {
      reasons.push('CONFIGURATION_INCOMPLETE')
    }
    if (provider.platformQualificationStatus !== 'QUALIFIED') reasons.push('REQUIREMENTS_NOT_CONFIGURED')
    if (provider.blocks.length > 0) reasons.push('PROVIDER_BLOCKED')
    const capacity = provider.capacitySnapshots[0]
    if (!capacity || capacity.validUntil <= at || !capacity.acceptsNewAssignments) reasons.push('CAPACITY_STALE')
    if (provider.capabilities.length === 0 || provider.capabilities.some((item) => item.qualificationDecisions.length === 0)) {
      reasons.push('QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED')
    }
    const status = reasons.length === 0 ? 'SELECTABLE' : provider.blocks.length > 0 ? 'BLOCKED' : 'NOT_SELECTABLE'
    const checksum = hashProviderJson({ providerProfileId, providerVersion: provider.version, readinessAssessmentId: readiness.id, reasons: [...new Set(reasons)].sort(), status }).sha256
    const assessment = await transaction.providerSelectabilityAssessment.create({
      data: { providerProfileId, readinessAssessmentId: readiness.id, status, reasonCodes: [...new Set(reasons)].sort(), sourceVersion: provider.version, checksum },
      select: { id: true, status: true, reasonCodes: true, checksum: true },
    })
    await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { selectabilityStatus: status } })
    return assessment
  })
}
