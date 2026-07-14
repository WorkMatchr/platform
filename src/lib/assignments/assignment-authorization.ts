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
              user: { select: { status: true } },
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
      primarySpecialismId: true,
      sectorId: true,
      employeeCount: true,
      desiredStartDate: true,
      responseDeadline: true,
      locationId: true,
      allowsRemoteWork: true,
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
            select: { role: true, status: true, user: { select: { status: true } } },
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
