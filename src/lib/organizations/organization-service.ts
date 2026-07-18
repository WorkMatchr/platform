import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { canCreateOrganization, canManageOrganization, shouldCreateProviderProfile } from './organization-policy'
import type { CreateOrganizationInput, OrganizationProfileInput } from './organization-validation'
import { assertNormalOrganizationOperationAllowed } from '@/lib/account-architecture/platform-organization-governance'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { assertCanCreateTenantMembership, TenantMembershipPolicyError } from '@/lib/account-architecture/tenant-membership-policy'

export class OrganizationServiceError extends Error {
  constructor(message = 'De organisatiegegevens konden niet veilig worden verwerkt.') {
    super(message)
    this.name = 'OrganizationServiceError'
  }
}

async function validateSectors(transaction: Prisma.TransactionClient, sectorIds: string[], primarySectorId: string) {
  const uniqueIds = [...new Set(sectorIds)]
  if (!uniqueIds.includes(primarySectorId)) throw new OrganizationServiceError('De primaire sector moet geselecteerd zijn.')
  const count = await transaction.sector.count({ where: { id: { in: uniqueIds }, isActive: true } })
  if (count !== uniqueIds.length) throw new OrganizationServiceError('Eén of meer geselecteerde sectoren zijn niet beschikbaar.')
  return uniqueIds
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
  return getPrisma().$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({ where: { id: userId }, select: { status: true } })
    if (!user || !canCreateOrganization(user.status)) throw new OrganizationServiceError('Uw account heeft geen toegang tot deze actie.')
    try {
      await assertCanCreateTenantMembership(transaction, userId)
    } catch (error) {
      if (error instanceof TenantMembershipPolicyError) {
        throw new OrganizationServiceError('Uw account is al aan een organisatie gekoppeld. Gebruik voor een andere organisatie een afzonderlijk account.')
      }
      throw error
    }

    const sectorIds = await validateSectors(transaction, input.sectorIds, input.primarySectorId)
    const organization = await transaction.organization.create({
      data: {
        name: input.name,
        tradeName: input.tradeName,
        chamberOfCommerceNumber: input.chamberOfCommerceNumber,
        organizationType: input.organizationType,
        status: 'ACTIVE',
        website: input.website,
        phone: input.phone,
        generalEmail: input.generalEmail,
        employeeCount: input.employeeCount,
        memberships: { create: { userId, role: 'OWNER', status: 'ACTIVE' } },
        sectors: { create: sectorIds.map((sectorId) => ({ sectorId, isPrimary: sectorId === input.primarySectorId })) },
        locations: {
          create: {
            label: 'Hoofdlocatie',
            addressLine: input.addressLine,
            postalCode: input.postalCode,
            city: input.city,
            province: input.province,
            countryCode: input.countryCode,
            isPrimary: true,
          },
        },
        providerProfile: shouldCreateProviderProfile(input.organizationType)
          ? { create: { approvalStatus: 'DRAFT', isAvailable: false } }
          : undefined,
      },
      select: { id: true, memberships: { where: { userId }, select: { id: true } } },
    })

    const membership = organization.memberships[0]
    if (!membership) throw new OrganizationServiceError('De organisatiekoppeling kon niet veilig worden vastgelegd.')
    const correlationId = `organization-onboarding:${organization.id}`
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED',
      membershipId: membership.id,
      userId,
      organizationId: organization.id,
      actorUserId: userId,
      previousStatus: null,
      newStatus: 'ACTIVE',
      previousRole: null,
      newRole: 'OWNER',
      reasonCode: 'ORGANIZATION_ONBOARDING_OWNER_CREATED',
      correlationId,
      idempotencyKey: `organization-onboarding:membership:${membership.id}`,
      metadata: { policyVersion: 'ADR013_PHASE2B_V1' },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ORGANIZATION_LINKED',
      subjectUserId: userId,
      actorUserId: userId,
      organizationId: organization.id,
      membershipId: membership.id,
      reasonCode: 'ORGANIZATION_ONBOARDING_OWNER_LINKED',
      correlationId,
      idempotencyKey: `organization-onboarding:account:${membership.id}`,
      metadata: { policyVersion: 'ADR013_PHASE2B_V1' },
    })

    return { id: organization.id }
  })
}

export async function updateOrganization(userId: string, organizationId: string, input: OrganizationProfileInput) {
  return getPrisma().$transaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: { select: { status: true, organizationType: true, systemKey: true } } },
    })
    if (!membership || !canManageOrganization(membership.role, membership.status, membership.organization.status)) {
      throw new OrganizationServiceError('U heeft geen toegang tot deze organisatieactie.')
    }
    assertNormalOrganizationOperationAllowed(membership.organization, 'UPDATE')

    const sectorIds = await validateSectors(transaction, input.sectorIds, input.primarySectorId)
    const primaryLocation = await transaction.organizationLocation.findFirst({
      where: { organizationId, archivedAt: null, isPrimary: true },
      select: { id: true },
    })
    if (!primaryLocation) throw new OrganizationServiceError('De primaire locatie ontbreekt.')

    await transaction.organization.update({
      where: { id: organizationId },
      data: {
        name: input.name,
        tradeName: input.tradeName,
        chamberOfCommerceNumber: input.chamberOfCommerceNumber,
        website: input.website,
        phone: input.phone,
        generalEmail: input.generalEmail,
        employeeCount: input.employeeCount,
      },
    })
    await transaction.organizationSector.deleteMany({ where: { organizationId } })
    await transaction.organizationSector.createMany({
      data: sectorIds.map((sectorId) => ({ organizationId, sectorId, isPrimary: sectorId === input.primarySectorId })),
    })
    await transaction.organizationLocation.updateMany({ where: { organizationId, archivedAt: null }, data: { isPrimary: false } })
    await transaction.organizationLocation.update({
      where: { id: primaryLocation.id },
      data: {
        addressLine: input.addressLine,
        postalCode: input.postalCode,
        city: input.city,
        province: input.province,
        countryCode: input.countryCode,
        isPrimary: true,
      },
    })
  })
}
