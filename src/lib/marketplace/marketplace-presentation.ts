import type {
  CreditTransactionType,
  MarketplaceMatchRunStatus,
  ProviderInvitationStatus,
  ProviderParticipationStatus,
  QuoteStatus,
} from '@/generated/prisma/client'

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: 'Nog invullen',
  SUBMITTED: 'Ingediend',
  WITHDRAWN: 'Ingetrokken',
  EXPIRED: 'Verlopen',
  REJECTED: 'Niet gekozen',
  AWARDED: 'Gegund',
}

export const invitationStatusLabels: Record<ProviderInvitationStatus, string> = {
  INVITED: 'Uitgenodigd',
  ACCEPTED: 'Geaccepteerd',
  DECLINED: 'Afgewezen',
  EXPIRED: 'Verlopen',
  WITHDRAWN: 'Ingetrokken',
}

export const participationStatusLabels: Record<ProviderParticipationStatus, string> = {
  ACTIVE: 'Actief',
  WITHDRAWN: 'Ingetrokken',
  EXPIRED: 'Verlopen',
  CLOSED: 'Afgerond',
}

export const matchRunStatusLabels: Record<MarketplaceMatchRunStatus, string> = {
  RUNNING: 'Selectie wordt uitgevoerd',
  COMPLETED: 'Selectie afgerond',
  FAILED: 'Selectie mislukt',
  SUPERSEDED: 'Vervangen door een nieuwe selectie',
}

export const creditTransactionTypeLabels: Record<CreditTransactionType, string> = {
  PURCHASE: 'Aankoop',
  SPEND: 'Besteding',
  REFUND: 'Terugbetaling',
  ADMIN_ADJUSTMENT: 'Beheercorrectie',
  EXPIRATION: 'Verlopen',
  ADMIN_GRANT: 'Toegekend door beheer',
  ADMIN_CORRECTION: 'Gecorrigeerd door beheer',
  RESERVATION: 'Gereserveerd',
  RESERVATION_RELEASE: 'Reservering vrijgegeven',
  CONSUMPTION: 'Definitief besteed',
  PARTICIPATION_PAYMENT: 'Deelnameplaats betaald',
  WITHDRAWAL_REFUND: 'Teruggave na intrekking',
  UNAWARDED_QUOTE_REFUND: 'Teruggave na niet-gegunde offerte',
  MANUAL_COMPENSATION: 'Compensatie',
  COMMERCIAL_GESTURE: 'Commerciële tegemoetkoming',
  SPONSORSHIP: 'Sponsoring of samenwerking',
  PROMOTION: 'Promotie of campagne',
  CONTRIBUTION_BONUS: 'Bonus voor bijdrage',
  REVERSAL: 'Tegenboeking',
  OTHER: 'Andere creditmutatie',
}

const confidenceLabels: Readonly<Record<string, string>> = {
  HOOG: 'Hoog',
  MIDDEL: 'Middel',
  LAAG: 'Laag',
  HIGH: 'Hoog',
  MEDIUM: 'Middel',
  LOW: 'Laag',
}

export function presentMatchConfidence(value: string): string {
  return confidenceLabels[value] ?? 'Niet vastgesteld'
}

export function presentInvitationStatus(value: string): string {
  return invitationStatusLabels[value as ProviderInvitationStatus] ?? 'Status niet beschikbaar'
}

export function presentQuoteStatus(value: string): string {
  return quoteStatusLabels[value as QuoteStatus] ?? 'Status niet beschikbaar'
}
