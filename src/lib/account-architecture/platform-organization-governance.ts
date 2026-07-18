import type { OrganizationStatus, OrganizationType } from '@/generated/prisma/enums'
import { WORKMATCHR_PLATFORM_ORGANIZATION } from './platform-organization-service'

export type NormalOrganizationOperation =
  | 'UPDATE'
  | 'ARCHIVE'
  | 'DELETE'
  | 'CREATE_PROVIDER_PROFILE'
  | 'CREATE_INTAKE'
  | 'CREATE_ASSIGNMENT'

type OrganizationIdentity = {
  organizationType: OrganizationType
  status: OrganizationStatus
  systemKey: string | null
}

export class PlatformOrganizationGovernanceError extends Error {
  constructor(operation: NormalOrganizationOperation) {
    super(`De platformorganisatie kan niet via de normale organisatiebewerking ${operation} worden beheerd.`)
    this.name = 'PlatformOrganizationGovernanceError'
  }
}

export function isPlatformOrganization(organization: Pick<OrganizationIdentity, 'organizationType' | 'systemKey'>) {
  return (
    organization.organizationType === 'PLATFORM_OPERATOR' ||
    organization.systemKey === WORKMATCHR_PLATFORM_ORGANIZATION.systemKey
  )
}

export function assertNormalOrganizationOperationAllowed(
  organization: OrganizationIdentity,
  operation: NormalOrganizationOperation,
): void {
  if (isPlatformOrganization(organization)) throw new PlatformOrganizationGovernanceError(operation)
}

export const normalTenantOrganizationWhere = {
  organizationType: { not: 'PLATFORM_OPERATOR' as const },
  systemKey: null,
}
