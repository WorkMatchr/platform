import type {
  IntakeQuestionnaireVersionStatus,
  MembershipStatus,
  NotificationOutboxStatus,
  OrganizationMembershipRole,
  OrganizationStatus,
  PlatformRole,
  ProviderTaxonomyVersionStatus,
  UserStatus,
} from '@/generated/prisma/client'

export const organizationRoleLabels: Record<OrganizationMembershipRole, string> = {
  OWNER: 'Eigenaar',
  ADMIN: 'Beheerder',
  MEMBER: 'Medewerker',
}

export const platformRoleLabels: Record<PlatformRole, string> = {
  USER: 'Gebruiker',
  ADMIN: 'Platformbeheerder',
}

export const userStatusLabels: Record<UserStatus, string> = {
  INVITED: 'Uitgenodigd',
  ACTIVE: 'Actief',
  BLOCKED: 'Geblokkeerd',
  ARCHIVED: 'Gearchiveerd',
  DELETION_PENDING: 'Verwijdering gepland',
  ANONYMIZED: 'Geanonimiseerd',
}

export const organizationStatusLabels: Record<OrganizationStatus, string> = {
  PENDING: 'In afwachting',
  ACTIVE: 'Actief',
  SUSPENDED: 'Geblokkeerd',
  ARCHIVED: 'Gearchiveerd',
}

export const membershipStatusLabels: Record<MembershipStatus, string> = {
  INVITED: 'Uitgenodigd',
  ACTIVE: 'Actief',
  SUSPENDED: 'Geblokkeerd',
  REMOVED: 'Beëindigd',
}

export const questionnaireVersionStatusLabels: Record<IntakeQuestionnaireVersionStatus, string> = {
  DRAFT: 'In voorbereiding',
  PUBLISHED: 'Gepubliceerd',
  RETIRED: 'Niet meer actief',
}

export const notificationOutboxStatusLabels: Record<NotificationOutboxStatus, string> = {
  PENDING: 'Wacht op verwerking',
  PROCESSING: 'Wordt verwerkt',
  SENT: 'Verzonden',
  FAILED: 'Mislukt',
}

export const providerTaxonomyVersionStatusLabels: Record<ProviderTaxonomyVersionStatus, string> = {
  DRAFT: 'In voorbereiding',
  PUBLISHED: 'Gepubliceerd',
  RETIRED: 'Niet meer actief',
}

export function presentUnknownStatus(): string {
  return 'Status niet beschikbaar'
}
