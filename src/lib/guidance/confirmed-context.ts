import type { ContextFact, GuidanceOutcome } from './guidance-domain'

export const physicalWorkloadFactKeys = Object.freeze({
  workActivity: 'PUBLIC_INTAKE_CONTEXT_WORK_ACTIVITY',
  physicalLoad: 'PUBLIC_INTAKE_CONTEXT_PHYSICAL_LOAD',
  affectedScope: 'PUBLIC_INTAKE_CONTEXT_AFFECTED_SCOPE',
  existingInvestigation: 'PUBLIC_INTAKE_CONTEXT_EXISTING_INVESTIGATION',
  vibration: 'PUBLIC_INTAKE_CONTEXT_VIBRATION',
  vehicle: 'PUBLIC_INTAKE_CONTEXT_VEHICLE',
  occupationalPhysicianRelevant:
    'PUBLIC_INTAKE_CONTEXT_OCCUPATIONAL_PHYSICIAN_RELEVANT',
} as const)

export function normalizeConfirmedValue(value: unknown): string {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('nl-NL')
}

export function confirmedFact(
  facts: readonly ContextFact[],
  key: string,
): ContextFact | null {
  return (
    facts.find((fact) => fact.key === key && fact.status === 'CONFIRMED') ??
    null
  )
}

export function confirmedFactMatches(
  facts: readonly ContextFact[],
  key: string,
  values: readonly (string | boolean)[],
): boolean {
  const fact = confirmedFact(facts, key)
  if (!fact) return false

  const actual = normalizeConfirmedValue(fact.value)
  return values.some(
    (value) => normalizeConfirmedValue(value) === actual,
  )
}

const contextSummaryLabels: Readonly<
  Record<string, (value: unknown) => string | null>
> = Object.freeze({
    [physicalWorkloadFactKeys.workActivity]: (value) => {
      const normalized = normalizeConfirmedValue(value)
      if (normalized === 'vooral lichamelijk werk') {
        return 'Het gaat vooral om lichamelijk werk.'
      }
      if (normalized === 'vooral beeldscherm- of kantoorwerk') {
        return 'Het gaat vooral om beeldscherm- of kantoorwerk.'
      }
      if (normalized === 'een combinatie') {
        return 'Het gaat om een combinatie van lichamelijk en ander werk.'
      }
      return null
    },
    [physicalWorkloadFactKeys.physicalLoad]: (value) => {
      const normalized = normalizeConfirmedValue(value)
      const labels: Readonly<Record<string, string>> = Object.freeze({
        'repeterend werk': 'De bevestigde belasting is repeterend werk.',
        'tillen of dragen': 'Tillen of dragen is de belangrijkste bevestigde belasting.',
        'duwen of trekken': 'Duwen of trekken is de belangrijkste bevestigde belasting.',
        'langdurig zitten of staan':
          'Langdurig zitten of staan is de belangrijkste bevestigde belasting.',
        trillingen: 'Trillingen zijn als relevante belasting bevestigd.',
      })
      return labels[normalized] ?? null
    },
    [physicalWorkloadFactKeys.affectedScope]: (value) => {
      const normalized = normalizeConfirmedValue(value)
      if (normalized === 'bij meerdere medewerkers') {
        return 'Dit speelt bij meerdere medewerkers.'
      }
      if (normalized === 'bij een medewerker') {
        return 'Dit speelt bij één medewerker.'
      }
      return null
    },
    [physicalWorkloadFactKeys.existingInvestigation]: (value) => {
      const normalized = normalizeConfirmedValue(value)
      if (normalized === 'nee') {
        return 'De situatie is nog niet onderzocht of opgenomen in een RI&E.'
      }
      if (normalized === 'ja') {
        return 'De situatie is al onderzocht of opgenomen in een RI&E.'
      }
      return null
    },
})

export function summarizeConfirmedContext(
  baseSummary: string,
  facts: readonly ContextFact[],
): string {
  const normalizedBase = baseSummary.trim()
  const additions = facts.flatMap((fact) => {
    if (fact.status !== 'CONFIRMED') return []
    const present = contextSummaryLabels[fact.key]
    const sentence = present?.(fact.value)
    return sentence && !normalizedBase.includes(sentence) ? [sentence] : []
  })

  if (additions.length === 0) return normalizedBase
  return [normalizedBase, ...new Set(additions)].join(' ')
}

export function confirmedReasonFactKeys(
  outcome: Pick<GuidanceOutcome, 'facts'>,
): readonly string[] {
  return Object.freeze(
    outcome.facts
      .filter((fact) => fact.status === 'CONFIRMED')
      .map((fact) => fact.key),
  )
}
