import type { AssignmentStatus, OrganizationMembershipRole, Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireIntakeConverter } from '@/lib/intakes/intake-authorization'
import { intakeIdentifierSchema } from '@/lib/intakes/intake-validation'
import { AssignmentServiceError } from './assignment-errors'
import { requireAssignmentManager, requireAssignmentViewer } from './assignment-authorization'

export type AssignmentListFilter = 'all' | 'draft' | 'cancelled'

export type AssignmentListItem = {
  id: string
  title: string
  status: AssignmentStatus
  createdAt: string
  organizationName: string
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
  location: string | null
  allowsRemoteWork: boolean
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
  locationId: string | null
  allowsRemoteWork: boolean
  locations: Array<{ id: string; label: string }>
}

function statusWhere(filter: AssignmentListFilter): Prisma.AssignmentWhereInput {
  if (filter === 'draft') return { status: 'DRAFT' }
  if (filter === 'cancelled') return { status: 'CANCELLED' }
  return { status: { not: 'ARCHIVED' } }
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
  filter: AssignmentListFilter = 'all',
): Promise<{ items: AssignmentListItem[]; viewerRole: OrganizationMembershipRole }> {
  return getPrisma().$transaction(async (transaction) => {
    const organization = await transaction.organization.findFirst({
      where: { id: organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        memberships: {
          where: { userId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
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
        allowsRemoteWork: true,
        createdAt: true,
        updatedAt: true,
        clientOrganization: { select: { name: true } },
        intake: { select: { id: true, freeText: true } },
        sector: { select: { name: true } },
        location: { select: { label: true, city: true } },
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
      location: assignment.location ? `${assignment.location.label} — ${assignment.location.city}` : null,
      allowsRemoteWork: assignment.allowsRemoteWork,
      revisionCount: assignment._count.revisions,
      canManage: ['OWNER', 'ADMIN'].includes(access.clientOrganization.memberships[0]!.role),
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
      locationId: access.locationId,
      allowsRemoteWork: access.allowsRemoteWork,
      locations: locations.map((location) => ({ id: location.id, label: `${location.label} — ${location.city}` })),
    }
  })
}
