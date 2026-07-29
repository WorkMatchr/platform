import { createHash } from 'node:crypto'

export const platformActionStatuses = [
  'NEW',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'WAITING_FOR_ORGANIZATION',
  'COMPLETED',
  'CLOSED',
] as const

export type PlatformActionStatus = (typeof platformActionStatuses)[number]

export const platformActionStatusLabels: Record<PlatformActionStatus, string> = {
  NEW: 'Nieuw',
  IN_PROGRESS: 'In behandeling',
  WAITING_FOR_USER: 'Wacht op gebruiker',
  WAITING_FOR_ORGANIZATION: 'Wacht op organisatie',
  COMPLETED: 'Afgerond',
  CLOSED: 'Gesloten',
}

export type PlatformActionCategory =
  | 'Gebruikers'
  | 'Organisaties'
  | 'Dienstverleners'
  | 'Opdrachten'
  | 'Reviews'
  | 'Goedkeuringen'
  | 'Governance'
  | 'Platform'

const categoryByRuleCode: Record<string, PlatformActionCategory> = {
  PLATFORM_CONFIGURATION_INVALID: 'Platform',
  ORGANIZATION_WITHOUT_ACTIVE_OWNER: 'Governance',
  ACCOUNT_WITHOUT_VALID_CONTEXT: 'Gebruikers',
  STALE_ASSIGNMENT_WITHOUT_RESPONSES: 'Opdrachten',
  REVIEW_WAITING_LONGER_THAN_SEVEN_DAYS: 'Reviews',
  REVIEW_QUEUE_ITEM: 'Reviews',
  APPROVAL_QUEUE_ITEM: 'Goedkeuringen',
  FAILED_NOTIFICATION_OUTBOX: 'Platform',
  ASSIGNMENT_WITHOUT_CANDIDATES: 'Opdrachten',
  EXPIRED_PROVIDER_INVITATION: 'Opdrachten',
  BLOCKED_ACCOUNT_REQUIRES_REVIEW: 'Gebruikers',
  PROVIDER_MISSING_REQUIRED_VERIFICATION: 'Dienstverleners',
}

export function getPlatformActionCategory(ruleCode: string): PlatformActionCategory {
  return categoryByRuleCode[ruleCode] ?? 'Platform'
}

export function getPlatformActionLabel(ruleCode: string): 'Bekijk' | 'Handel af' | 'Open dossier' {
  if (
    ruleCode === 'REVIEW_WAITING_LONGER_THAN_SEVEN_DAYS' ||
    ruleCode === 'REVIEW_QUEUE_ITEM' ||
    ruleCode === 'APPROVAL_QUEUE_ITEM' ||
    ruleCode === 'PROVIDER_MISSING_REQUIRED_VERIFICATION'
  ) {
    return 'Open dossier'
  }
  if (
    ruleCode === 'ORGANIZATION_WITHOUT_ACTIVE_OWNER' ||
    ruleCode === 'ACCOUNT_WITHOUT_VALID_CONTEXT' ||
    ruleCode === 'PLATFORM_CONFIGURATION_INVALID'
  ) {
    return 'Handel af'
  }
  return 'Bekijk'
}

export function platformSignalAuditId(signalId: string): string {
  const bytes = Buffer.from(createHash('sha256').update(`workmatchr:platform-signal:${signalId}`).digest().subarray(0, 16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function isOpenPlatformActionStatus(status: PlatformActionStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CLOSED'
}
