export type PlatformAdviceSeverity = 'CRITICAL' | 'HIGH' | 'NORMAL'

export type PlatformAdviceSource = {
  label: string
  value: string
}

export type PlatformAdviceSignal = {
  id: string
  severity: PlatformAdviceSeverity
  title: string
  explanation: string
  recommendedAction: string
  href: string
  sources: PlatformAdviceSource[]
  ruleCode: string
}

export type PlatformAdminAdviceInput = {
  at: Date
  platformConfigurationValid: boolean
  organizationsWithoutActiveOwner: Array<{ id: string; name: string }>
  accountsWithoutValidContext: Array<{ id: string; label: string }>
  staleAssignmentsWithoutResponses: Array<{
    id: string
    title: string
    openedAt: Date
    responseCount: number
  }>
  staleReviews: Array<{
    id: string
    providerProfileId: string
    providerName: string
    submittedAt: Date
  }>
  expiredInvitations: Array<{
    id: string
    assignmentId: string
    assignmentTitle: string
    deadlineAt: Date
  }>
  blockedAccounts: Array<{ id: string; label: string; organizationName: string | null }>
  providersMissingVerification: Array<{
    id: string
    organizationName: string
    reasonCodes: string[]
  }>
  assignmentsWithoutCandidates: Array<{ id: string; assignmentId: string; assignmentTitle: string }>
  failedOutboxCount: number
}

export type PlatformStatus = {
  level: 'HEALTHY' | 'ATTENTION' | 'CRITICAL'
  label: string
  summary: string
}

const severityOrder: Record<PlatformAdviceSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
}

function elapsedDays(from: Date, until: Date) {
  return Math.max(0, Math.floor((until.getTime() - from.getTime()) / 86_400_000))
}

function source(label: string, value: string | number): PlatformAdviceSource {
  return { label, value: String(value) }
}

export function buildPlatformAdviceSignals(input: PlatformAdminAdviceInput): PlatformAdviceSignal[] {
  const signals: PlatformAdviceSignal[] = []

  if (!input.platformConfigurationValid) {
    signals.push({
      id: 'platform-configuration',
      severity: 'CRITICAL',
      title: 'Platformconfiguratie is niet volledig geldig',
      explanation: 'De centrale WorkMatchr-platformorganisatie ontbreekt of heeft niet de vereiste actieve systeemstatus.',
      recommendedAction: 'Controleer de platformorganisatie en herstel de systeemconfiguratie voordat beheeracties doorgaan.',
      href: '/platformbeheer/instellingen',
      sources: [source('Vereiste systeemidentiteit', 'WORKMATCHR_PLATFORM')],
      ruleCode: 'PLATFORM_CONFIGURATION_INVALID',
    })
  }

  for (const organization of input.organizationsWithoutActiveOwner) {
    signals.push({
      id: `organization-owner:${organization.id}`,
      severity: 'CRITICAL',
      title: `${organization.name} heeft geen actieve eigenaar`,
      explanation: 'Deze actieve organisatie heeft geen actieve OWNER die bestuurlijke verantwoordelijkheid kan dragen.',
      recommendedAction: 'Controleer de lifecycle en wijs via de beschermde OWNER-flow een actieve eigenaar toe.',
      href: `/platformbeheer/organisaties/${organization.id}`,
      sources: [source('Actieve OWNERs', 0), source('Organisatie', organization.name)],
      ruleCode: 'ORGANIZATION_WITHOUT_ACTIVE_OWNER',
    })
  }

  for (const account of input.accountsWithoutValidContext) {
    signals.push({
      id: `account-context:${account.id}`,
      severity: 'CRITICAL',
      title: `${account.label} heeft geen geldige accountcontext`,
      explanation: 'Het actieve account heeft geen organisatiebinding en ook geen expliciete actieve platformpermission.',
      recommendedAction: 'Controleer provisioning, accounttype en membership voordat het account wordt gebruikt.',
      href: `/platformbeheer/gebruikers/${account.id}`,
      sources: [source('Actieve memberships', 0), source('Actieve platformpermissions', 0)],
      ruleCode: 'ACCOUNT_WITHOUT_VALID_CONTEXT',
    })
  }

  for (const assignment of input.staleAssignmentsWithoutResponses) {
    const daysOpen = elapsedDays(assignment.openedAt, input.at)
    signals.push({
      id: `assignment-no-response:${assignment.id}`,
      severity: 'HIGH',
      title: `${assignment.title} wacht al ${daysOpen} dagen op een reactie`,
      explanation: `De opdracht staat ${daysOpen} dagen open en heeft nog geen ingediende reactie.`,
      recommendedAction: 'Controleer de selectie en nodig waar passend aanvullende geschikte dienstverleners uit.',
      href: `/platformbeheer/opdrachten?q=${encodeURIComponent(assignment.title)}`,
      sources: [source('Dagen open', daysOpen), source('Reacties', assignment.responseCount)],
      ruleCode: 'STALE_ASSIGNMENT_WITHOUT_RESPONSES',
    })
  }

  for (const review of input.staleReviews) {
    const daysWaiting = elapsedDays(review.submittedAt, input.at)
    signals.push({
      id: `stale-review:${review.id}`,
      severity: 'HIGH',
      title: `Dossier van ${review.providerName} wacht op review`,
      explanation: `Het ingediende dossier staat al ${daysWaiting} dagen in de reviewwachtrij.`,
      recommendedAction: 'Plan de beoordeling en wijs deze toe aan een bevoegde reviewer.',
      href: `/platformbeheer/dienstverleners/${review.providerProfileId}`,
      sources: [source('Dagen in wachtrij', daysWaiting), source('Dossierstatus', 'SUBMITTED')],
      ruleCode: 'REVIEW_WAITING_LONGER_THAN_SEVEN_DAYS',
    })
  }

  if (input.failedOutboxCount > 0) {
    signals.push({
      id: 'failed-notification-outbox',
      severity: 'HIGH',
      title: `${input.failedOutboxCount} notificatie${input.failedOutboxCount === 1 ? '' : 's'} kon${input.failedOutboxCount === 1 ? '' : 'den'} niet worden verwerkt`,
      explanation: 'De notificatie-outbox bevat foutstatussen die handmatige controle vereisen.',
      recommendedAction: 'Controleer de outboxstatus en los de onderliggende transport- of configuratiefout op.',
      href: '/platformbeheer/marketplace',
      sources: [source('Mislukte outboxitems', input.failedOutboxCount)],
      ruleCode: 'FAILED_NOTIFICATION_OUTBOX',
    })
  }

  for (const matchRun of input.assignmentsWithoutCandidates) {
    signals.push({
      id: `assignment-no-candidates:${matchRun.id}`,
      severity: 'HIGH',
      title: `${matchRun.assignmentTitle} heeft geen geschikte kandidaten`,
      explanation: 'De afgeronde selectieronde bevat geen geselecteerde dienstverlener.',
      recommendedAction: 'Controleer de opdrachtcriteria, providerprojecties en uitsluitingsredenen voordat een nieuwe selectie wordt gestart.',
      href: `/platformbeheer/opdrachten?q=${encodeURIComponent(matchRun.assignmentTitle)}`,
      sources: [source('Geselecteerde kandidaten', 0), source('Selectiestatus', 'COMPLETED')],
      ruleCode: 'ASSIGNMENT_WITHOUT_CANDIDATES',
    })
  }

  for (const invitation of input.expiredInvitations) {
    signals.push({
      id: `expired-invitation:${invitation.id}`,
      severity: 'NORMAL',
      title: `Uitnodiging voor ${invitation.assignmentTitle} is verlopen`,
      explanation: 'De reactietermijn is verstreken zonder geaccepteerde deelname.',
      recommendedAction: 'Beoordeel of een expliciete vervolgselectie of nieuwe uitnodiging nodig is.',
      href: `/platformbeheer/opdrachten?q=${encodeURIComponent(invitation.assignmentTitle)}`,
      sources: [
        source('Deadline', invitation.deadlineAt.toLocaleDateString('nl-NL')),
        source('Uitnodigingsstatus', 'EXPIRED'),
      ],
      ruleCode: 'EXPIRED_PROVIDER_INVITATION',
    })
  }

  for (const account of input.blockedAccounts) {
    signals.push({
      id: `blocked-account:${account.id}`,
      severity: 'NORMAL',
      title: `${account.label} is geblokkeerd`,
      explanation: account.organizationName
        ? `Het account binnen ${account.organizationName} heeft geen toegang tot WorkMatchr.`
        : 'Het account heeft geen toegang tot WorkMatchr.',
      recommendedAction: 'Controleer de lifecycle, reden en noodzaak van de blokkade.',
      href: `/platformbeheer/gebruikers/${account.id}`,
      sources: [source('Accountstatus', 'BLOCKED'), source('Organisatie', account.organizationName ?? 'Geen')],
      ruleCode: 'BLOCKED_ACCOUNT_REQUIRES_REVIEW',
    })
  }

  for (const provider of input.providersMissingVerification) {
    signals.push({
      id: `provider-verification:${provider.id}`,
      severity: 'NORMAL',
      title: `${provider.organizationName} mist vereiste verificatie`,
      explanation: 'De dienstverlener is niet selecteerbaar doordat één of meer vereiste gegevens niet voldoende zijn geverifieerd.',
      recommendedAction: 'Controleer dossier, bewijs en openstaande verificatieredenen.',
      href: `/platformbeheer/dienstverleners/${provider.id}`,
      sources: [
        source('Selecteerbaarheid', 'NOT_SELECTABLE'),
        source('Redencodes', provider.reasonCodes.join(', ') || 'VERIFICATION_REQUIRED'),
      ],
      ruleCode: 'PROVIDER_MISSING_REQUIRED_VERIFICATION',
    })
  }

  return signals.sort((left, right) => (
    severityOrder[left.severity] - severityOrder[right.severity] ||
    left.ruleCode.localeCompare(right.ruleCode) ||
    left.id.localeCompare(right.id)
  ))
}

export function derivePlatformStatus(signals: PlatformAdviceSignal[]): PlatformStatus {
  if (signals.some((signal) => signal.severity === 'CRITICAL')) {
    return {
      level: 'CRITICAL',
      label: 'Direct ingrijpen nodig',
      summary: 'Er zijn kritieke governance- of configuratieproblemen die eerst moeten worden opgelost.',
    }
  }
  if (signals.length > 0) {
    return {
      level: 'ATTENTION',
      label: 'Aandacht nodig',
      summary: 'Het platform functioneert, maar er zijn concrete acties die vandaag aandacht vragen.',
    }
  }
  return {
    level: 'HEALTHY',
    label: 'Gezond',
    summary: 'Er zijn momenteel geen concrete platformsignalen die actie vereisen.',
  }
}

export function getDutchGreeting(at: Date) {
  const hour = Number(new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Europe/Amsterdam',
  }).format(at))
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export function selectCoreKpis(input: {
  activeOrganizations: number | null
  activeUsers: number | null
  selectableProviders: number | null
  openAssignments: number | null
}) {
  return [
    { key: 'active-organizations', label: 'Actieve organisaties', value: input.activeOrganizations, href: '/platformbeheer/organisaties?status=ACTIVE' },
    { key: 'active-users', label: 'Actieve gebruikers', value: input.activeUsers, href: '/platformbeheer/gebruikers?status=ACTIVE' },
    { key: 'selectable-providers', label: 'Selecteerbare dienstverleners', value: input.selectableProviders, href: '/platformbeheer/dienstverleners?status=SELECTABLE' },
    { key: 'open-assignments', label: 'Open opdrachten', value: input.openAssignments, href: '/platformbeheer/opdrachten' },
  ].filter((metric): metric is { key: string; label: string; value: number; href: string } => metric.value !== null)
}

export function selectVisibleQueues<T extends { count: number }>(queues: readonly T[]) {
  return queues.filter((queue) => queue.count > 0)
}
