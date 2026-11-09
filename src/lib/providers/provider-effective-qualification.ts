import type { Prisma, ProviderQualificationDecision } from '@/generated/prisma/client'

export const decisionHistory = {
  select: { id: true, dossierCandidateId: true, providerProfileId: true, validFrom: true, validUntil: true, createdAt: true, outcome: true },
  orderBy: [{ validFrom: 'asc' }, { createdAt: 'asc' }],
} satisfies Prisma.ProviderQualificationDecisionFindManyArgs

type Decision = Pick<ProviderQualificationDecision, keyof typeof decisionHistory.select>

// Input is ordered by effective time, then registration. An identical effective instant
// is ambiguous: registration order or a UUID cannot give one competing decision priority.
export function qualificationAt(history: Decision[], profileId: string, at: Date) {
  let current: Decision | null = null
  let previous: Decision | null = null
  let started = false
  let suspended = false
  let nextChange: Date | null = null
  for (let i = 0; i < history.length; i++) {
    const decision = history[i]
    if (decision.validFrom > at) {
      nextChange = decision.validFrom
      break
    }
    const preceding = previous
    started = true
    const duplicate = (i > 0 && +history[i - 1].validFrom === +decision.validFrom) ||
      (i + 1 < history.length && +history[i + 1].validFrom === +decision.validFrom)
    current = null
    previous = duplicate || decision.providerProfileId !== profileId ? null : decision
    if (!previous || decision.outcome === 'SUSPENDED') {
      suspended = true
      continue
    }
    if (decision.outcome === 'RESTORED') {
      if (!preceding) {
        suspended = true
        continue
      }
      suspended = false
    }
    if (!suspended && (decision.outcome === 'QUALIFIED' || decision.outcome === 'RESTORED') &&
        (decision.validUntil === null || decision.validUntil > at)) current = decision
  }
  return { current, previous, started, suspended, nextChange }
}

export const profileDecisionHistory = {
  qualificationDecisions: { ...decisionHistory, where: { scope: 'PLATFORM' as const } },
  capabilities: { where: { status: 'ACTIVE' as const }, select: { id: true, qualificationDecisions: decisionHistory } },
}

type Sources = {
  id: string
  qualificationDecisions: Decision[]
  capabilities: { id: string; qualificationDecisions: Decision[] }[]
}

// Existing selectability requires qualification for every active service.
export function profileQualificationAt(provider: Sources, at: Date) {
  const platform = qualificationAt(provider.qualificationDecisions, provider.id, at)
  const capabilities = provider.capabilities.map(cap => qualificationAt(cap.qualificationDecisions, provider.id, at))
  const allServicesQualified = capabilities.length > 0 && capabilities.every(cap => cap.current !== null &&
    (!platform.current?.dossierCandidateId || cap.current.dossierCandidateId === platform.current.dossierCandidateId))
  const boundaries = [platform, ...capabilities].flatMap(item => [item.current?.validUntil, item.nextChange])
    .filter((date): date is Date => date != null)
  const adverse = [platform, ...capabilities].some(scope => scope.started && !scope.current)
  return { platform: platform.current, allServicesQualified, boundaries, adverse }
}
