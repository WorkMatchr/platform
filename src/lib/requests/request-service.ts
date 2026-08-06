import { z } from 'zod'
import type {
  AdviceDossierStatus,
  OrganizationStatus,
  OrganizationType,
  Prisma,
  RequestRequestedStart,
} from '@/generated/prisma/client'
import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import {
  professionalRequirementSnapshotSchema,
  secondaryProfessionalRequirementSnapshotSchema,
} from '@/lib/advice-dossiers/advice-dossier-contract'
import type { AdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-service'
import { getPrisma } from '@/lib/prisma'
import {
  requestPublicationInputSchema,
  type RequestPublicationInput,
} from './request-contract'
import { createRequestEligibilitySnapshot } from './request-eligibility-service'
import {
  getPublicationRestriction,
  getPublicationRestrictionInTransaction,
} from '@/lib/marketplace/marketplace-reliability-service'

type Transaction = Prisma.TransactionClient

export class RequestServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'NOT_ELIGIBLE'
      | 'ACCESS_DENIED'
      | 'PUBLICATION_REVIEW_REQUIRED'
      | 'CONFLICT',
  ) {
    super(code)
    this.name = 'RequestServiceError'
  }
}

export type RequestReference = Readonly<{
  id: string
  requestNumber: string
}>

type ExpertiseSnapshot = Readonly<{
  primary: string
  additional: readonly string[]
  possible: readonly string[]
  primaryCodes: readonly string[]
  additionalCodes: readonly string[]
  possibleCodes: readonly string[]
}>

const publicationDossierInclude = {
  ownerUser: {
    select: {
      id: true,
      displayName: true,
      email: true,
    },
  },
  organization: {
    select: {
      id: true,
      name: true,
      tradeName: true,
      status: true,
      organizationType: true,
      generalEmail: true,
      phone: true,
      locations: {
        where: { archivedAt: null },
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 1,
        select: {
          city: true,
          province: true,
        },
      },
      sectors: {
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 1,
        select: {
          sector: { select: { name: true } },
        },
      },
    },
  },
  versions: {
    orderBy: { versionNumber: 'desc' as const },
    take: 1,
    select: {
      versionNumber: true,
      situationSummary: true,
      subject: true,
      primaryProfessionalRequirementSnapshot: true,
      additionalProfessionalRequirementsSnapshot: true,
    },
  },
  request: {
    select: {
      id: true,
      requestNumber: true,
      status: true,
      publishedAt: true,
    },
  },
} satisfies Prisma.AdviceDossierInclude

type PublicationDossier = Prisma.AdviceDossierGetPayload<{
  include: typeof publicationDossierInclude
}>

function expertiseFromVersion(
  version: Pick<
    PublicationDossier['versions'][number],
    | 'versionNumber'
    | 'primaryProfessionalRequirementSnapshot'
    | 'additionalProfessionalRequirementsSnapshot'
  > | null | undefined,
  currentVersionNumber: number,
): ExpertiseSnapshot {
  if (
    !version ||
    version.versionNumber !== currentVersionNumber
  ) {
    throw new RequestServiceError('CONFLICT')
  }
  const primary = professionalRequirementSnapshotSchema.safeParse(
    version.primaryProfessionalRequirementSnapshot,
  )
  if (!primary.success) {
    throw new RequestServiceError('NOT_ELIGIBLE')
  }
  const secondary = z
    .array(secondaryProfessionalRequirementSnapshotSchema)
    .safeParse(version.additionalProfessionalRequirementsSnapshot)
  if (!secondary.success) {
    throw new RequestServiceError('CONFLICT')
  }
  return Object.freeze({
    primary: primary.data.label,
    additional: Object.freeze(
      secondary.data
        .filter((item) => item.priority === 'ADDITIONAL')
        .map((item) => item.label),
    ),
    possible: Object.freeze(
      secondary.data
        .filter((item) => item.priority === 'POSSIBLE')
        .map((item) => item.label),
    ),
    primaryCodes: Object.freeze([
      ...new Set(primary.data.capabilityCodes),
    ]),
    additionalCodes: Object.freeze([
      ...new Set(
        secondary.data
          .filter((item) => item.priority === 'ADDITIONAL')
          .flatMap((item) => item.capabilityCodes),
      ),
    ]),
    possibleCodes: Object.freeze([
      ...new Set(
        secondary.data
          .filter((item) => item.priority === 'POSSIBLE')
          .flatMap((item) => item.capabilityCodes),
      ),
    ]),
  })
}

function assertDossierOwner(
  viewer: AdviceDossierViewer,
  dossier: {
    ownerUserId: string
    organizationId: string
    status: AdviceDossierStatus
    organization: {
      status: OrganizationStatus
      organizationType: OrganizationType
    }
  },
) {
  if (
    !viewer.organizationId ||
    viewer.userId !== dossier.ownerUserId ||
    viewer.organizationId !== dossier.organizationId
  ) {
    throw new RequestServiceError('NOT_FOUND')
  }
  if (
    dossier.status !== 'COMPLETED' ||
    dossier.organization.status !== 'ACTIVE' ||
    dossier.organization.organizationType !== 'CLIENT'
  ) {
    throw new RequestServiceError('NOT_ELIGIBLE')
  }
}

function regionFromDossier(dossier: PublicationDossier): string | null {
  const location = dossier.organization.locations[0]
  return location?.province?.trim() || location?.city.trim() || null
}

function sectorFromDossier(dossier: PublicationDossier): string | null {
  return dossier.organization.sectors[0]?.sector.name ?? null
}

function normalizeRegionCode(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replaceAll('-', '_')
      .replaceAll(' ', '_') ?? null
  )
}

function requestTitle(subject: string): string {
  return `Professionele ondersteuning bij ${subject}`.slice(0, 200)
}

export async function getRequestPublicationPreview(
  viewer: AdviceDossierViewer,
  adviceDossierId: string,
) {
  const dossier = await getPrisma().adviceDossier.findUnique({
    where: { id: adviceDossierId },
    include: publicationDossierInclude,
  })
  if (!dossier) throw new RequestServiceError('NOT_FOUND')
  assertDossierOwner(viewer, dossier)
  const expertise = expertiseFromVersion(
    dossier.versions[0],
    dossier.currentVersionNumber,
  )
  const version = dossier.versions[0]!
  const publicationRestriction = await getPublicationRestriction({
    organizationId: dossier.organization.id,
    adviceDossierId: dossier.id,
  })
  return {
    adviceDossierId: dossier.id,
    dossierCode: dossier.dossierCode,
    title: requestTitle(version.subject),
    publicSummary: version.situationSummary,
    expertise,
    organization: {
      name: dossier.organization.tradeName ?? dossier.organization.name,
      contactName: dossier.ownerUser.displayName ?? 'Niet opgegeven',
      email:
        dossier.organization.generalEmail ??
        dossier.ownerUser.email,
      phone: dossier.organization.phone ?? 'Niet opgegeven',
      region: regionFromDossier(dossier) ?? 'Niet opgegeven',
      sector: sectorFromDossier(dossier) ?? 'Niet opgegeven',
    },
    existingRequest: dossier.request,
    publicationRestriction,
  } as const
}

async function allocateRequestNumber(
  transaction: Transaction,
  year: number,
): Promise<string> {
  await transaction.$queryRaw(
    PrismaNamespace.sql`
      SELECT pg_advisory_xact_lock(87322, ${year})::text AS "lock"
    `,
  )
  const rows = await transaction.$queryRaw<Array<{ nextNumber: number }>>(
    PrismaNamespace.sql`
      INSERT INTO "RequestCounter" ("year", "nextNumber", "updatedAt")
      VALUES (${year}, 1, NOW())
      ON CONFLICT ("year") DO UPDATE
      SET "nextNumber" = "RequestCounter"."nextNumber" + 1,
          "updatedAt" = NOW()
      RETURNING "nextNumber"
    `,
  )
  const allocated = rows[0]?.nextNumber
  if (!allocated) throw new RequestServiceError('CONFLICT')
  return `WM-R-${year}-${String(allocated).padStart(6, '0')}`
}

function isPrismaConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false
  }
  if (error.code === 'P2002' || error.code === 'P2034') return true
  const serialized = JSON.stringify(error)
  return (
    (error instanceof Error && error.message.includes('40001')) ||
    serialized.includes('40001')
  )
}

async function publishRequestAttempt(input: {
  viewer: AdviceDossierViewer
  publication: RequestPublicationInput
  at: Date
}): Promise<RequestReference> {
  return getPrisma().$transaction(
    async (transaction) => {
      await transaction.$queryRaw(
        PrismaNamespace.sql`
          SELECT "id"
          FROM "AdviceDossier"
          WHERE "id" = ${input.publication.adviceDossierId}::uuid
          FOR UPDATE
        `,
      )
      const existing = await transaction.request.findUnique({
        where: {
          adviceDossierId: input.publication.adviceDossierId,
        },
        select: {
          id: true,
          requestNumber: true,
          tenantId: true,
          adviceDossier: {
            select: { ownerUserId: true },
          },
        },
      })
      if (existing) {
        if (
          existing.adviceDossier.ownerUserId !== input.viewer.userId ||
          existing.tenantId !== input.viewer.organizationId
        ) {
          throw new RequestServiceError('ACCESS_DENIED')
        }
        return {
          id: existing.id,
          requestNumber: existing.requestNumber,
        }
      }

      const dossier = await transaction.adviceDossier.findUnique({
        where: { id: input.publication.adviceDossierId },
        select: {
          id: true,
          ownerUserId: true,
          organizationId: true,
          status: true,
          currentVersionNumber: true,
        },
      })
      if (!dossier) throw new RequestServiceError('NOT_FOUND')
      const organization = await transaction.organization.findUnique({
        where: { id: dossier.organizationId },
        select: {
          status: true,
          organizationType: true,
        },
      })
      if (!organization) throw new RequestServiceError('NOT_FOUND')
      assertDossierOwner(input.viewer, {
        ...dossier,
        organization,
      })
      const membership =
        await transaction.organizationMembership.findUnique({
          where: { userId: input.viewer.userId },
          select: {
            organizationId: true,
            status: true,
            user: { select: { accountType: true } },
            organization: {
              select: {
                status: true,
                organizationType: true,
              },
            },
          },
        })
      if (
        !membership ||
        membership.organizationId !== dossier.organizationId ||
        membership.status !== 'ACTIVE' ||
        membership.user.accountType !== 'CLIENT' ||
        membership.organization.status !== 'ACTIVE' ||
        membership.organization.organizationType !== 'CLIENT'
      ) {
        throw new RequestServiceError('ACCESS_DENIED')
      }

      const publicationRestriction =
        await getPublicationRestrictionInTransaction(transaction, {
          organizationId: dossier.organizationId,
          adviceDossierId: dossier.id,
          at: input.at,
        })
      if (publicationRestriction.blocked) {
        throw new RequestServiceError('PUBLICATION_REVIEW_REQUIRED')
      }

      const version = await transaction.adviceDossierVersion.findUnique({
        where: {
          adviceDossierId_versionNumber: {
            adviceDossierId: dossier.id,
            versionNumber: dossier.currentVersionNumber,
          },
        },
        select: {
          versionNumber: true,
          subject: true,
          primaryProfessionalRequirementSnapshot: true,
          additionalProfessionalRequirementsSnapshot: true,
        },
      })
      const expertise = expertiseFromVersion(
        version,
        dossier.currentVersionNumber,
      )
      if (!version) throw new RequestServiceError('CONFLICT')
      const location = await transaction.organizationLocation.findFirst({
        where: {
          organizationId: dossier.organizationId,
          archivedAt: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: { province: true, city: true },
      })
      const organizationSector =
        await transaction.organizationSector.findFirst({
          where: { organizationId: dossier.organizationId },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            sector: {
              select: {
                name: true,
                providerSectorTaxonomyMap: {
                  select: { term: { select: { code: true } } },
                },
              },
            },
          },
        })
      const requestNumber = await allocateRequestNumber(
        transaction,
        input.at.getUTCFullYear(),
      )
      const region =
        location?.province?.trim() || location?.city.trim() || null
      const sectorCode =
        organizationSector?.sector.providerSectorTaxonomyMap?.term.code ??
        null
      const request = await transaction.request.create({
        data: {
          requestNumber,
          tenantId: dossier.organizationId,
          organizationId: dossier.organizationId,
          adviceDossierId: dossier.id,
          status: 'PUBLISHED',
          title: requestTitle(version.subject),
          publicSummary: input.publication.publicSummary,
          region,
          sector: organizationSector?.sector.name ?? null,
          requestedStart:
            input.publication
              .requestedStart as RequestRequestedStart,
          notes: input.publication.notes || null,
          primaryExpertise: expertise.primary,
          additionalExpertise: [...expertise.additional],
          possibleExpertise: [...expertise.possible],
          primaryExpertiseCodes: [...expertise.primaryCodes],
          additionalExpertiseCodes: [...expertise.additionalCodes],
          possibleExpertiseCodes: [...expertise.possibleCodes],
          regionCode: normalizeRegionCode(region),
          sectorCode,
          createdAt: input.at,
          publishedAt: input.at,
        },
        select: {
          id: true,
          requestNumber: true,
          regionCode: true,
          sectorCode: true,
          primaryExpertise: true,
          additionalExpertise: true,
          possibleExpertise: true,
          primaryExpertiseCodes: true,
          additionalExpertiseCodes: true,
          possibleExpertiseCodes: true,
        },
      })
      const eligibleCount = await createRequestEligibilitySnapshot(
        transaction,
        request,
        input.at,
      )
      await transaction.requestEvent.create({
        data: {
          requestId: request.id,
          actorUserId: input.viewer.userId,
          type: 'REQUEST_PUBLISHED',
          idempotencyKey: `request:${request.id}:published`,
          occurredAt: input.at,
        },
      })
      if (publicationRestriction.approvedContactRequestId) {
        await transaction.marketplaceContactRequest.update({
          where: { id: publicationRestriction.approvedContactRequestId },
          data: { status: 'CLOSED', requestId: request.id },
        })
      }
      await transaction.requestEvent.create({
        data: {
          requestId: request.id,
          actorUserId: input.viewer.userId,
          type: 'ELIGIBILITY_SNAPSHOT_CREATED',
          idempotencyKey: `request:${request.id}:eligibility`,
          occurredAt: input.at,
        },
      })
      return {
        id: request.id,
        requestNumber: request.requestNumber,
        eligibleCount,
      }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function publishRequest(input: {
  viewer: AdviceDossierViewer
  publication: RequestPublicationInput
  at?: Date
}): Promise<RequestReference> {
  const publication = requestPublicationInputSchema.parse(
    input.publication,
  )
  const at = input.at ?? new Date()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await publishRequestAttempt({
        viewer: input.viewer,
        publication,
        at,
      })
    } catch (error) {
      if (error instanceof RequestServiceError) throw error
      if (!isPrismaConflict(error)) throw error
    }
    const existing = await getPrisma().request.findUnique({
      where: { adviceDossierId: publication.adviceDossierId },
      select: {
        id: true,
        requestNumber: true,
        tenantId: true,
        adviceDossier: { select: { ownerUserId: true } },
      },
    })
    if (existing) {
      if (
        existing.adviceDossier.ownerUserId !== input.viewer.userId ||
        existing.tenantId !== input.viewer.organizationId
      ) {
        throw new RequestServiceError('ACCESS_DENIED')
      }
      return {
        id: existing.id,
        requestNumber: existing.requestNumber,
      }
    }
  }
  throw new RequestServiceError('CONFLICT')
}

function ownRequestWhere(viewer: AdviceDossierViewer) {
  if (!viewer.organizationId) {
    throw new RequestServiceError('ACCESS_DENIED')
  }
  return {
    tenantId: viewer.organizationId,
    adviceDossier: { ownerUserId: viewer.userId },
  } satisfies Prisma.RequestWhereInput
}

export async function listOwnRequests(viewer: AdviceDossierViewer) {
  return getPrisma().request.findMany({
    where: ownRequestWhere(viewer),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      requestNumber: true,
      title: true,
      status: true,
      publishedAt: true,
      _count: {
        select: {
          eligibleProviders: true,
          interests: { where: { status: 'INTERESTED' } },
          offerSlots: { where: { status: 'CLAIMED' } },
        },
      },
    },
  })
}

export async function getOwnRequest(
  viewer: AdviceDossierViewer,
  requestId: string,
) {
  const request = await getPrisma().request.findFirst({
    where: { id: requestId, ...ownRequestWhere(viewer) },
    select: {
      id: true,
      requestNumber: true,
      title: true,
      status: true,
      publishedAt: true,
      _count: {
        select: {
          eligibleProviders: true,
          interests: { where: { status: 'INTERESTED' } },
          offerSlots: { where: { status: 'CLAIMED' } },
        },
      },
      offerSlots: {
        where: { status: 'CLAIMED' },
        orderBy: { slotNumber: 'asc' },
        select: {
          id: true,
          creditAmount: true,
          marketplaceRuleSet: {
            select: {
              withdrawalRefundPercentage: true,
              roundRefundUp: true,
            },
          },
        },
      },
    },
  })
  if (!request) throw new RequestServiceError('NOT_FOUND')
  return request
}
