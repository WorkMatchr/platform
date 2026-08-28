import type { AssignmentStatus, OrganizationMembershipRole, Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireIntakeConverter } from '@/lib/intakes/intake-authorization'
import { intakeIdentifierSchema } from '@/lib/intakes/intake-validation'
import { AssignmentServiceError } from './assignment-errors'
import { requireAssignmentManager, requireAssignmentViewer } from './assignment-authorization'
import { assignmentLocationLabel, type AssignmentLocationSnapshot } from './assignment-location'

export type AssignmentListFilter = 'active' | 'completed' | 'cancelled'

export type AssignmentListItem = {
  id: string
  title: string
  status: AssignmentStatus
  createdAt: string
  organizationName: string
  canDelete: boolean
}

export type AssignmentDetailView = AssignmentListItem & {
  description: string
  updatedAt: string
  version: number
  intakeId: string | null
  originalHelpRequest: string | null
  sectorName: string | null
  employeeCount: number | null
  desiredStartDate: string | null
  location: string
  locationDescription: string | null
  locationItems: string[]
  allowsRemoteWork: boolean
  maxSelections: number
  publishedAt: string | null
  publishedByName: string | null
  publishedVersion: number | null
  revisionCount: number
  canManage: boolean
  statusHistory: Array<{
    status: AssignmentStatus
    createdAt: string
    reason: string | null
  }>
}

export type AssignmentEditView = {
  id: string
  title: string
  description: string
  status: AssignmentStatus
  version: number
  employeeCount: number | null
  desiredStartDate: string | null
  locationType: AssignmentLocationSnapshot['locationType']
  locationId: string | null
  locationCity: string | null
  locationRegion: string | null
  locationDescription: string | null
  locationCount: number | null
  locationItems: string[]
  locations: Array<{ id: string; label: string }>
}

function statusWhere(filter: AssignmentListFilter): Prisma.AssignmentWhereInput {
  if (filter === 'completed') {
    return { publishedAt: { not: null }, status: { in: ['AWARDED', 'CLOSED'] } }
  }
  if (filter === 'cancelled') {
    return { publishedAt: { not: null }, status: 'CANCELLED' }
  }
  return {
    publishedAt: { not: null },
    status: { in: ['OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] },
  }
}

export async function getIntakeSubmissionContext(
  userId: string,
  organizationId: string,
  intakeId: string,
) {
  const parsedIntakeId = intakeIdentifierSchema.safeParse(intakeId)
  if (!parsedIntakeId.success) {
    throw new AssignmentServiceError('ACCESS_DENIED', 'Deze hulpvraag is niet beschikbaar.')
  }
  return getPrisma().$transaction(async (transaction) => {
    const intake = await requireIntakeConverter(transaction, userId, parsedIntakeId.data)
    if (intake.clientOrganizationId !== organizationId) {
      throw new AssignmentServiceError('ACCESS_DENIED', 'Deze hulpvraag is niet beschikbaar.')
    }
    const assignment = await transaction.assignment.findUnique({
      where: { intakeId },
      select: { id: true },
    })
    return { intakeId: intake.id, version: intake.version, status: intake.status, assignmentId: assignment?.id ?? null }
  })
}

export async function listAssignmentsForOrganization(
  userId: string,
  organizationId: string,
  filter: AssignmentListFilter = 'active',
): Promise<{ items: AssignmentListItem[]; viewerRole: OrganizationMembershipRole }> {
  return getPrisma().$transaction(async (transaction) => {
    const organization = await transaction.organization.findFirst({
      where: { id: organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        memberships: {
          where: { userId, status: 'ACTIVE', user: { status: 'ACTIVE', accountType: 'CLIENT' } },
          select: { role: true },
          take: 1,
        },
      },
    })
    const membership = organization?.memberships[0]
    if (!organization || !membership) {
      throw new AssignmentServiceError('ACCESS_DENIED', 'Deze opdrachten zijn niet beschikbaar.')
    }

    const assignments = await transaction.assignment.findMany({
      where: {
        clientOrganizationId: organization.id,
        ...statusWhere(filter),
        ...(membership.role === 'MEMBER' ? { intake: { createdByUserId: userId } } : {}),
      },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      viewerRole: membership.role,
      items: assignments.map((assignment) => ({
        ...assignment,
        createdAt: assignment.createdAt.toISOString(),
        organizationName: organization.name,
        canDelete: ['OWNER', 'ADMIN'].includes(membership.role) && ['DRAFT', 'READY_FOR_REVIEW'].includes(assignment.status),
      })),
    }
  })
}

export async function getAssignmentDetail(
  userId: string,
  organizationId: string,
  assignmentId: string,
): Promise<AssignmentDetailView> {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireAssignmentViewer(transaction, userId, organizationId, assignmentId)
    const assignment = await transaction.assignment.findUnique({
      where: { id: access.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        version: true,
        employeeCount: true,
        desiredStartDate: true,
        locationType: true,
        locationId: true,
        locationName: true,
        locationAddressLine: true,
        locationPostalCode: true,
        locationCity: true,
        locationProvince: true,
        locationCountryCode: true,
        locationRegion: true,
        locationDescription: true,
        locationCount: true,
        locationItems: { select: { placeOrRegion: true }, orderBy: { position: 'asc' } },
        allowsRemoteWork: true,
        maxSelections: true,
        publishedAt: true,
        publishedVersion: true,
        createdAt: true,
        updatedAt: true,
        publishedByUser: { select: { displayName: true } },
        clientOrganization: { select: { name: true } },
        intake: { select: { id: true, freeText: true } },
        sector: { select: { name: true } },
        statusHistory: {
          select: { toStatus: true, createdAt: true, reason: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { revisions: true } },
      },
    })
    if (!assignment) throw new AssignmentServiceError('ACCESS_DENIED', 'Deze opdracht is niet beschikbaar.')

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      status: assignment.status,
      version: assignment.version,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
      organizationName: assignment.clientOrganization.name,
      intakeId: assignment.intake?.id ?? null,
      originalHelpRequest: assignment.intake?.freeText ?? null,
      sectorName: assignment.sector?.name ?? null,
      employeeCount: assignment.employeeCount,
      desiredStartDate: assignment.desiredStartDate?.toISOString() ?? null,
      location: assignmentLocationLabel(assignment, assignment.locationItems),
      locationDescription: assignment.locationDescription,
      locationItems: (assignment.locationItems ?? []).map((item) => item.placeOrRegion),
      allowsRemoteWork: assignment.allowsRemoteWork,
      maxSelections: assignment.maxSelections,
      publishedAt: assignment.publishedAt?.toISOString() ?? null,
      publishedByName: assignment.publishedByUser?.displayName ?? null,
      publishedVersion: assignment.publishedVersion,
      revisionCount: assignment._count.revisions,
      canManage: ['OWNER', 'ADMIN'].includes(access.clientOrganization.memberships[0]!.role),
      canDelete:
        ['OWNER', 'ADMIN'].includes(access.clientOrganization.memberships[0]!.role)
        && ['DRAFT', 'READY_FOR_REVIEW'].includes(assignment.status)
        && assignment.publishedAt === null,
      statusHistory: assignment.statusHistory.map((item) => ({
        status: item.toStatus,
        createdAt: item.createdAt.toISOString(),
        reason: item.reason,
      })),
    }
  })
}

export async function getAssignmentEditView(
  userId: string,
  organizationId: string,
  assignmentId: string,
): Promise<AssignmentEditView> {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireAssignmentManager(transaction, userId, organizationId, assignmentId)
    if (access.status !== 'DRAFT') throw new AssignmentServiceError('INVALID_STATUS', 'Alleen een conceptopdracht kan worden gewijzigd.')
    const locations = await transaction.organizationLocation.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, label: true, city: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
    return {
      id: access.id,
      title: access.title,
      description: access.description,
      status: access.status,
      version: access.version,
      employeeCount: access.employeeCount,
      desiredStartDate: access.desiredStartDate?.toISOString().slice(0, 10) ?? null,
      locationType: access.locationType,
      locationId: access.locationId,
      locationCity: access.locationCity,
      locationRegion: access.locationRegion,
      locationDescription: access.locationDescription,
      locationCount: access.locationCount,
      locationItems: access.locationItems.map((item) => item.placeOrRegion),
      locations: locations.map((location) => ({ id: location.id, label: `${location.label} — ${location.city}` })),
    }
  })
}
