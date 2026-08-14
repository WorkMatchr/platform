import type {
  DominantContext,
  GuidanceOutcome,
  ProfessionalAdviceRiskDomain,
} from './guidance-domain'
import {
  confirmedFactMatches,
  physicalWorkloadFactKeys,
} from './confirmed-context'

type ProfessionalAdviceInput = Omit<GuidanceOutcome, 'professionalAdvice'>

export type ProfessionalAdviceContext = Readonly<{
  dominantContext: DominantContext
  relevantRiskDomains: readonly ProfessionalAdviceRiskDomain[]
}>

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('nl-NL')
}

function containsAny(text: string, signals: readonly string[]): boolean {
  return signals.some((signal) => text.includes(signal))
}

const ergonomicsSignals = [
  'tillift',
  'tillen',
  'duwen',
  'trekken',
  'rolweerstand',
  'vloerweerstand',
  'werkhouding',
  'werkhoogte',
  'repeterende',
  'zorgergonomie',
  'werkplekinrichting',
  'fysieke belasting',
  'ergonom',
  'hulpmiddel',
  'stoel',
  'vering',
  'rugbelasting',
] as const

const complexSafetySignals = [
  'meerdere locaties',
  'meerdere processen',
  'majeure wijziging',
  'procesveiligheid',
  'infrastructuur',
  'multidisciplinair',
  'complex',
] as const

function adviceContext(
  dominantContext: DominantContext,
  relevantRiskDomains: readonly ProfessionalAdviceRiskDomain[],
): ProfessionalAdviceContext {
  return Object.freeze({
    dominantContext,
    relevantRiskDomains: Object.freeze([...relevantRiskDomains]),
  })
}

function extractLitres(text: string): readonly number[] {
  const values = [...text.matchAll(/(\d[\d.\s]*)(?:,\d+)?\s*(?:l|liter)\b/g)]
    .map((match) => Number(match[1].replace(/[.\s]/g, '')))
    .filter(Number.isFinite)

  return Object.freeze(values)
}

function hazardousSubstancesContext(
  outcome: ProfessionalAdviceInput,
): ProfessionalAdviceContext {
  const text = normalize(outcome.helpRequest.originalInput)
  const litres = extractLitres(text)
  const largestVolume = litres.length > 0 ? Math.max(...litres) : 0
  const storageSignal = containsAny(text, [
    'opslag',
    'opslaan',
    'opslagtank',
    'tank',
    'ibc',
    'vaten',
    'vat',
    'jerrycan',
    'pgs',
    'vergunning',
    'melding',
  ])
  const scaleSignal =
    largestVolume >= 10_000 ||
    containsAny(text, [
      'grootschalige opslag',
      'grote hoeveelheid',
      'forse uitbreiding',
    ])
  const exposureSignal = containsAny(text, [
    'blootstelling',
    'damp',
    'dampen',
    'huidcontact',
    'ventilatie',
    'meting',
    'metingen',
    'dagelijks',
    'ruiken',
    'inadem',
  ])
  const transferSignal = containsAny(text, [
    'laden',
    'lossen',
    'overpompen',
    'overpomp',
    'vullen',
    'tanken',
  ])

  if (storageSignal && scaleSignal) {
    return adviceContext(
      'LARGE_SCALE_STORAGE',
      [
        'STORAGE_SAFETY',
        'FIRE_AND_EXPLOSION_SAFETY',
        'ENVIRONMENT_AND_PERMITS',
        'PGS_APPLICABILITY',
        'SOIL_PROTECTION',
        'EMERGENCY_SCENARIOS',
        'LOADING_UNLOADING_TRANSFER',
        'EMPLOYEE_EXPOSURE',
      ],
    )
  }

  if (exposureSignal) {
    return adviceContext(
      'EXPOSURE',
      [
        'EMPLOYEE_EXPOSURE',
        ...(transferSignal
          ? (['LOADING_UNLOADING_TRANSFER'] as const)
          : []),
      ],
    )
  }

  if (storageSignal) {
    return adviceContext(
      'FIRE_SAFETY',
      [
        'STORAGE_SAFETY',
        'FIRE_AND_EXPLOSION_SAFETY',
        ...(transferSignal
          ? (['LOADING_UNLOADING_TRANSFER'] as const)
          : []),
        'EMPLOYEE_EXPOSURE',
      ],
    )
  }

  if (transferSignal) {
    return adviceContext('EXPOSURE', [
      'LOADING_UNLOADING_TRANSFER',
      'EMPLOYEE_EXPOSURE',
      'FIRE_AND_EXPLOSION_SAFETY',
    ])
  }

  return adviceContext('UNKNOWN', ['EMPLOYEE_EXPOSURE'])
}

export function resolveProfessionalAdviceContext(
  outcome: ProfessionalAdviceInput,
): ProfessionalAdviceContext {
  const text = normalize(outcome.helpRequest.originalInput)
  const confirmedPhysicalLoad = confirmedFactMatches(
    outcome.facts,
    physicalWorkloadFactKeys.physicalLoad,
    [
      'Tillen of dragen',
      'Duwen of trekken',
      'Repeterend werk',
      'Langdurig zitten of staan',
      'Trillingen',
    ],
  )

  if (containsAny(text, ['asbest', 'asbestverdacht'])) {
    return adviceContext('ASBEST', ['ASBEST_EXPOSURE'])
  }

  if (outcome.situation.code === 'HAZARDOUS_SUBSTANCES') {
    return hazardousSubstancesContext(outcome)
  }

  if (
    containsAny(text, [
      'machine',
      'arbeidsmiddel',
      'ce-document',
      'ce mark',
      'ce-mark',
      'veiligheidsfunctie',
      'afscherming',
      'loto',
    ])
  ) {
    return adviceContext('MACHINE_SAFETY', [
      'MACHINE_AND_WORK_EQUIPMENT_SAFETY',
    ])
  }

  if (
    containsAny(text, [
      'werkdruk',
      'ongewenst gedrag',
      'pesten',
      'agressie',
      'sociale veiligheid',
      'psychosociale',
      'psa',
    ])
  ) {
    return adviceContext('PSYCHOSOCIAL_WORKLOAD', [
      'PSYCHOSOCIAL_WORKLOAD',
    ])
  }

  if (
    containsAny(text, [
      're-integratie',
      'reintegratie',
      'belastbaarheid',
      'passende werkzaamheden',
      'werkhervatting',
      'inzetbaarheid',
    ])
  ) {
    return adviceContext('WORK_ABILITY', [
      'WORK_ABILITY_AND_REINTEGRATION',
    ])
  }

  if (confirmedPhysicalLoad || containsAny(text, ergonomicsSignals)) {
    return adviceContext('ERGONOMICS', ['PHYSICAL_WORKLOAD'])
  }

  if (
    containsAny(text, [
      'brandveilig',
      'brandcompartiment',
      'vluchtroute',
      'evacuatie',
      'brandscenario',
    ])
  ) {
    return adviceContext('FIRE_SAFETY', [
      'FIRE_AND_EXPLOSION_SAFETY',
      'EMERGENCY_SCENARIOS',
    ])
  }

  if (
    outcome.situation.code === 'RIE' &&
    containsAny(text, complexSafetySignals)
  ) {
    return adviceContext('COMPLEX_OPERATIONAL_SAFETY', [
      'OPERATIONAL_SAFETY',
      'RISK_ASSESSMENT',
    ])
  }

  if (
    outcome.situation.code === 'RIE' &&
    containsAny(text, [
      'inspectie',
      'werkplekrisico',
      'praktische veiligheid',
      'operationele veiligheid',
      'beheersmaatregel',
    ])
  ) {
    return adviceContext('OPERATIONAL_SAFETY', [
      'OPERATIONAL_SAFETY',
      'RISK_ASSESSMENT',
    ])
  }

  const bySituation: Readonly<
    Record<string, ProfessionalAdviceContext>
  > = Object.freeze({
    RIE: adviceContext('GENERAL_RISK_ASSESSMENT', [
      'RISK_ASSESSMENT',
    ]),
    INCIDENT: adviceContext('INCIDENT_RESPONSE', [
      'INCIDENT_INVESTIGATION',
    ]),
    OCCUPATIONAL_HEALTH: adviceContext('OCCUPATIONAL_HEALTH', [
      'WORK_AND_HEALTH',
    ]),
    EMERGENCY_RESPONSE: adviceContext('EMERGENCY_PREPAREDNESS', [
      'EMERGENCY_RESPONSE',
    ]),
  })

  return (
    bySituation[outcome.situation.code] ??
    adviceContext('UNKNOWN', [])
  )
}
