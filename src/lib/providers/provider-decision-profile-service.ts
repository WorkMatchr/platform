import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager, requireProviderViewer } from './provider-authorization'
import { requireProviderSectionEditable } from './provider-dossier-access'
import { ProviderServiceError } from './provider-errors'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'
import { presentProviderServiceTerm } from './provider-taxonomy-presentation'

const profileSelectionsSchema = z.object({
  expectedProfileVersion: z.int().positive(),
  coreExpertiseTermIds: z.array(z.uuid()).max(3),
  workModeTermIds: z.array(z.uuid()).max(12),
})

export type ProviderProfileCompleteness = {
  completed: number
  total: number
  percentage: number
  suggestions: string[]
}

type CompletenessSource = {
  logoStorageKey: string | null
  shortIntroduction: string | null
  description: string | null
  workingMethod: string | null
  coreExpertiseCount: number
  capabilityCount: number
  sectorCount: number
  workAreaCount: number
  workModeCount: number
}

export function deriveProviderProfileCompleteness(source: CompletenessSource): ProviderProfileCompleteness {
  const checks = [
    [Boolean(source.logoStorageKey), 'Voeg een organisatielogo toe.'],
    [Boolean(source.shortIntroduction?.trim()), 'Schrijf een korte introductie.'],
    [Boolean(source.description?.trim()), 'Beschrijf uw organisatie.'],
    [Boolean(source.workingMethod?.trim()), 'Beschrijf uw werkwijze.'],
    [source.coreExpertiseCount > 0, 'Kies maximaal drie kernexpertises.'],
    [source.capabilityCount > 0, 'Voeg minimaal één dienst toe.'],
    [source.sectorCount > 0, 'Voeg sectorervaring toe.'],
    [source.workAreaCount > 0, 'Selecteer uw werkgebied.'],
    [source.workModeCount > 0, 'Kies minimaal één werkvorm.'],
  ] as const
  const completed = checks.filter(([complete]) => complete).length
  return {
    completed,
    total: checks.length,
    percentage: Math.round((completed / checks.length) * 100),
    suggestions: checks.filter(([complete]) => !complete).map(([, suggestion]) => suggestion),
  }
}

async function loadProfile(transaction: Prisma.TransactionClient, providerProfileId: string) {
  return transaction.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: {
      id: true,
      version: true,
      shortIntroduction: true,
      description: true,
      workingMethod: true,
      lifecycleStatus: true,
      readinessStatus: true,
      platformQualificationStatus: true,
      selectabilityStatus: true,
      organization: {
        select: {
          id: true,
          name: true,
          tradeName: true,
          status: true,
          chamberOfCommerceNumber: true,
          website: true,
          employeeCount: true,
          logoStorageKey: true,
          logoWidth: true,
          logoHeight: true,
          locations: {
            where: { archivedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            take: 1,
            select: { label: true, addressLine: true, postalCode: true, city: true, province: true, countryCode: true },
          },
          sectors: {
            orderBy: { createdAt: 'asc' },
            select: { sector: { select: { name: true } } },
          },
        },
      },
      coreExpertises: {
        orderBy: { position: 'asc' },
        select: { position: true, taxonomyTermId: true, taxonomyTerm: { select: { code: true, label: true } } },
      },
      workModes: {
        orderBy: { taxonomyTerm: { sortOrder: 'asc' } },
        select: { taxonomyTermId: true, taxonomyTerm: { select: { code: true, label: true } } },
      },
      capabilities: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              serviceTermId: true,
              specialismTermId: true,
              deliveryModes: true,
              verificationLevel: true,
              serviceTerm: { select: { code: true, label: true } },
              specialismTerm: { select: { code: true, label: true } },
            },
          },
        },
      },
      sectorExperiences: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: { experienceYears: true, verificationLevel: true, sectorTerm: { select: { code: true, label: true } } },
          },
        },
      },
      workAreas: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: { verificationLevel: true, regionTerm: { select: { code: true, label: true } } },
          },
        },
      },
      organizationQualifications: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          status: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              registrationNumber: true,
              validUntil: true,
              verificationLevel: true,
              qualificationTerm: {
                select: { code: true, label: true, version: { select: { taxonomy: { select: { kind: true } } } } },
              },
              verificationReviews: { orderBy: { createdAt: 'desc' }, take: 1, select: { outcome: true, validUntil: true } },
            },
          },
        },
      },
      professionals: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          identityRevisions: { orderBy: { version: 'desc' }, take: 1, select: { displayName: true, functionalRole: true } },
          qualifications: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              revisions: {
                orderBy: { version: 'desc' },
                take: 1,
                select: {
                  issuer: true,
                  isCertified: true,
                  registrationNumber: true,
                  validUntil: true,
                  verificationLevel: true,
                  qualificationTerm: {
                    select: { code: true, label: true, version: { select: { taxonomy: { select: { kind: true } } } } },
                  },
                  verificationReviews: { orderBy: { createdAt: 'desc' }, take: 1, select: { outcome: true, validUntil: true } },
                },
              },
            },
          },
        },
      },
    },
  })
}

function claimStatus(revision: {
  verificationLevel: 'SELF_DECLARED' | 'DOCUMENT_CHECKED' | 'VERIFIED'
  validUntil: Date | null
  verificationReviews: Array<{ outcome: string; validUntil: Date | null }>
}, at = new Date()) {
  if (revision.validUntil && revision.validUntil <= at) return 'Verlopen'
  const review = revision.verificationReviews[0]
  if (review?.outcome === 'REJECTED') return 'Afgewezen'
  if (review?.outcome === 'EXPIRED' || (review?.validUntil && review.validUntil <= at)) return 'Verlopen'
  if (review?.outcome === 'CHANGES_REQUESTED') return 'In beoordeling'
  if (revision.verificationLevel === 'VERIFIED') return 'Geverifieerd door WorkMatchr'
  if (revision.verificationLevel === 'DOCUMENT_CHECKED') return 'Document gecontroleerd'
  return 'Zelf opgegeven'
}

function presentProfile(profile: NonNullable<Awaited<ReturnType<typeof loadProfile>>>) {
  const capabilities = profile.capabilities.flatMap((item) => item.revisions.map((revision) => ({
    ...revision,
    serviceTerm: presentProviderServiceTerm(revision.serviceTerm),
  })))
  const sectors = profile.sectorExperiences.flatMap((item) => item.revisions)
  const workAreas = profile.workAreas.flatMap((item) => item.revisions)
  const completeness = deriveProviderProfileCompleteness({
    logoStorageKey: profile.organization.logoStorageKey,
    shortIntroduction: profile.shortIntroduction,
    description: profile.description,
    workingMethod: profile.workingMethod,
    coreExpertiseCount: profile.coreExpertises.length,
    capabilityCount: capabilities.length,
    sectorCount: sectors.length,
    workAreaCount: workAreas.length,
    workModeCount: profile.workModes.length,
  })
  return {
    ...profile,
    capabilities,
    sectors,
    workAreas,
    organizationQualifications: profile.organizationQualifications.flatMap((item) => item.revisions.map((revision) => ({
      ...revision,
      id: item.id,
      statusLabel: claimStatus(revision),
    }))),
    professionals: profile.professionals.map((professional) => ({
      id: professional.id,
      identity: professional.identityRevisions[0] ?? null,
      qualifications: professional.qualifications.flatMap((item) => item.revisions.map((revision) => ({
        ...revision,
        id: item.id,
        statusLabel: claimStatus(revision),
      }))),
    })),
    completeness,
  }
}

export async function updateProviderProfileSelections(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(profileSelectionsSchema, rawInput)
  const coreExpertiseTermIds = [...new Set(input.coreExpertiseTermIds)]
  const workModeTermIds = [...new Set(input.workModeTermIds)]
  if (coreExpertiseTermIds.length > 3) throw new ProviderServiceError('VALIDATION_ERROR')

  return getPrisma().$transaction(async (transaction) => {
    await requireProviderManager(transaction, userId, providerProfileId)
    await requireProviderSectionEditable(transaction, providerProfileId, 'ORGANIZATION')
    await requireProviderSectionEditable(transaction, providerProfileId, 'CAPABILITIES')

    const specialismTerms = coreExpertiseTermIds.length === 0 ? [] : await transaction.providerTaxonomyTerm.findMany({
      where: {
        id: { in: coreExpertiseTermIds },
        isActive: true,
        version: { status: 'PUBLISHED', taxonomy: { kind: 'SPECIALISM' } },
      },
      select: { id: true },
    })
    if (specialismTerms.length !== coreExpertiseTermIds.length) throw new ProviderServiceError('VALIDATION_ERROR')

    const capabilities = await transaction.providerCapability.findMany({
      where: { providerProfileId, status: 'ACTIVE' },
      select: { revisions: { orderBy: { version: 'desc' }, take: 1, select: { specialismTermId: true } } },
    })
    const selectedSpecialisms = new Set(capabilities.flatMap((capability) => capability.revisions.map((revision) => revision.specialismTermId)).filter(Boolean))
    if (coreExpertiseTermIds.some((termId) => !selectedSpecialisms.has(termId))) throw new ProviderServiceError('VALIDATION_ERROR')

    const workModeTerms = workModeTermIds.length === 0 ? [] : await transaction.providerTaxonomyTerm.count({
      where: {
        id: { in: workModeTermIds },
        isActive: true,
        version: { status: 'PUBLISHED', taxonomy: { kind: 'WORK_MODE' } },
      },
    })
    if (workModeTerms !== workModeTermIds.length) throw new ProviderServiceError('VALIDATION_ERROR')

    await transaction.providerProfileCoreExpertise.deleteMany({ where: { providerProfileId } })
    if (coreExpertiseTermIds.length > 0) {
      await transaction.providerProfileCoreExpertise.createMany({
        data: coreExpertiseTermIds.map((taxonomyTermId, index) => ({ providerProfileId, taxonomyTermId, position: index + 1 })),
      })
    }
    await transaction.providerProfileWorkMode.deleteMany({ where: { providerProfileId } })
    if (workModeTermIds.length > 0) {
      await transaction.providerProfileWorkMode.createMany({
        data: workModeTermIds.map((taxonomyTermId) => ({ providerProfileId, taxonomyTermId })),
      })
    }
    return { profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion) }
  }, { isolationLevel: 'Serializable' })
}

export async function getProviderProfileEditor(userId: string, providerProfileId: string) {
  const prisma = getPrisma()
  const access = await requireProviderViewer(prisma, userId, providerProfileId)
  const profile = await loadProfile(prisma, providerProfileId)
  if (!profile) throw new ProviderServiceError('ACCESS_DENIED')
  const workModes = await prisma.providerTaxonomyTerm.findMany({
    where: { isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind: 'WORK_MODE' } } },
    select: { id: true, code: true, label: true },
    orderBy: { sortOrder: 'asc' },
  })
  return { ...presentProfile(profile), viewerRole: access.membershipRole, workModeOptions: workModes }
}

export async function getAssignmentProviderDecisionProfile(userId: string, assignmentId: string, providerProfileId: string) {
  return getPrisma().$transaction(async (transaction) => {
    const assignment = await transaction.assignment.findFirst({
      where: {
        id: assignmentId,
        clientOrganization: {
          status: 'ACTIVE',
          memberships: { some: { userId, status: 'ACTIVE', user: { status: 'ACTIVE' } } },
        },
        providerSelections: {
          some: { providerProfileId, status: { not: 'REMOVED' } },
        },
      },
      select: { id: true, title: true, status: true, clientOrganizationId: true },
    })
    if (!assignment) throw new ProviderServiceError('ACCESS_DENIED')
    const profile = await loadProfile(transaction, providerProfileId)
    if (!profile) throw new ProviderServiceError('ACCESS_DENIED')
    return { assignment, profile: presentProfile(profile) }
  })
}
