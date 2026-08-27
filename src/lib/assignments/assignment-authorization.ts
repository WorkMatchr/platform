import type { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'
import { AssignmentServiceError } from './assignment-errors'
import { canManageAssignment, canViewAssignment } from './assignment-policy'

const accessDenied = () =>
  new AssignmentServiceError('ACCESS_DENIED', 'Deze opdracht is niet beschikbaar.')

export async function requireAssignmentViewer(
  transaction: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
  assignmentId: string,
) {
  if (!z.uuid().safeParse(assignmentId).success) throw accessDenied()
  const assignment = await transaction.assignment.findFirst({
    where: {
      id: assignmentId,
      clientOrganizationId: organizationId,
      clientOrganization: { memberships: { some: { userId } } },
    },
    select: {
      id: true,
      clientOrganizationId: true,
      intake: { select: { createdByUserId: true } },
      clientOrganization: {
        select: {
          status: true,
          organizationType: true,
          memberships: {
            where: { userId },
            select: {
              role: true,
              status: true,
              user: { select: { status: true, accountType: true } },
            },
            take: 1,
          },
        },
      },
    },
  })

  const membership = assignment?.clientOrganization.memberships[0]
  if (
    !assignment ||
    !membership ||
    !canViewAssignment({
      userId,
      accountType: membership.user.accountType,
      userStatus: membership.user.status,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      organizationStatus: assignment.clientOrganization.status,
      organizationType: assignment.clientOrganization.organizationType,
      intakeCreatedByUserId: assignment.intake?.createdByUserId ?? null,
    })
  ) {
    throw accessDenied()
  }

  return assignment
}

export async function requireAssignmentManager(
  transaction: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
  assignmentId: string,
) {
  if (!z.uuid().safeParse(assignmentId).success) throw accessDenied()
  const assignment = await transaction.assignment.findFirst({
    where: { id: assignmentId, clientOrganizationId: organizationId },
    select: {
      id: true,
      intakeId: true,
      clientOrganizationId: true,
      createdByUserId: true,
      status: true,
      version: true,
      title: true,
      description: true,
      knowledgeContextId: true,
      knowledgeContextVersion: true,
      knowledgeSourceRoute: true,
      knowledgeSuggestedCategory: true,
      primarySpecialismId: true,
      sectorId: true,
      employeeCount: true,
      desiredStartDate: true,
      responseDeadline: true,
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
      locationItems: {
        select: { position: true, placeOrRegion: true, normalizedValue: true },
        orderBy: { position: 'asc' },
      },
      allowsRemoteWork: true,
      maxSelections: true,
      publishedAt: true,
      publishedByUserId: true,
      publishedVersion: true,
      closedAt: true,
      archivedAt: true,
      clientOrganization: {
        select: {
          status: true,
          organizationType: true,
          memberships: {
            where: { userId },
            select: { role: true, status: true, user: { select: { status: true, accountType: true } } },
            take: 1,
          },
        },
      },
    },
  })
  const membership = assignment?.clientOrganization.memberships[0]
  if (
    !assignment ||
    !membership ||
    !canManageAssignment({
      userId,
      accountType: membership.user.accountType,
      userStatus: membership.user.status,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      organizationStatus: assignment.clientOrganization.status,
      organizationType: assignment.clientOrganization.organizationType,
      intakeCreatedByUserId: null,
    })
  ) {
    throw accessDenied()
  }
  return assignment
}
