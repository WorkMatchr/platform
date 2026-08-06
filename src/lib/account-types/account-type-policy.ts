import type { AccountType, OrganizationType } from '@/generated/prisma/client'

export const accountTypeLabels: Record<AccountType, string> = {
  CLIENT: 'Bedrijf',
  PROFESSIONAL: 'Professional',
}

export function organizationTypeForAccountType(accountType: AccountType): Extract<OrganizationType, 'CLIENT' | 'PROVIDER'> {
  return accountType === 'CLIENT' ? 'CLIENT' : 'PROVIDER'
}

export function accountTypeSupportsClientWork(accountType: AccountType | null | undefined): boolean {
  return accountType === 'CLIENT'
}

export function accountTypeSupportsProfessionalWork(accountType: AccountType | null | undefined): boolean {
  return accountType === 'PROFESSIONAL'
}

export function isAccountTypeCompatibleWithOrganization(
  accountType: AccountType | null | undefined,
  organizationType: OrganizationType,
): boolean {
  if (accountType === 'CLIENT') return organizationType === 'CLIENT'
  if (accountType === 'PROFESSIONAL') return organizationType === 'PROVIDER' || organizationType === 'BOTH'
  return organizationType === 'PLATFORM_OPERATOR'
}
