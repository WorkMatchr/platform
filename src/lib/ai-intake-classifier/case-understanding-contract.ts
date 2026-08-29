import { z } from 'zod'

export const CASE_UNDERSTANDING_STATUS_CODES = [
  'EXPLICIT_INPUT',
  'RELIABLE_EXTRACTION',
  'USER_CONFIRMED',
  'HYPOTHESIS',
  'UNKNOWN',
] as const

export const CASE_UNDERSTANDING_ELEMENT_KEYS = [
  'userGoal',
  'organizationContext',
  'sectorContext',
  'workContext',
  'activities',
  'peopleAffected',
  'complaintsOrSignals',
  'hazards',
  'exposureSignals',
  'equipment',
  'substances',
  'locationContext',
  'timePattern',
  'recentChanges',
  'incidentContext',
  'existingMeasures',
  'existingMeasurements',
  'existingAssessment',
  'urgency',
  'requestedInvestigation',
  'requestedProfessional',
  'legalOrComplianceContext',
  'multiDisciplinarySignals',
  'knownFacts',
  'unknownRelevantFacts',
  'candidateExpertiseDomains',
] as const

export const MANAGED_CASE_EXPERTISE_DOMAIN_CODES = [
  'RIE',
  'INDOOR_ENVIRONMENT',
  'PHYSICAL_WORKLOAD',
  'WELDING_FUMES',
  'MACHINE_SAFETY',
  'PSYCHOSOCIAL_WORKLOAD',
  'OCCUPATIONAL_HEALTH_PRIVACY',
  'WORK_ABILITY_REINTEGRATION',
  'EMERGENCY_RESPONSE_ORGANIZATION',
  'PROCESS_SAFETY_MAJOR_HAZARDS',
  'EXPOSURE_ASSESSMENT',
  'UNKNOWN',
] as const

const elementSchema = z.object({
  value: z.array(z.string().trim().min(1).max(300)).max(20),
  evidence: z.array(z.string().trim().min(1).max(300)).max(20),
  confidence: z.number().min(0).max(1),
  status: z.enum(CASE_UNDERSTANDING_STATUS_CODES),
}).strict().superRefine((value, context) => {
  if (value.status === 'UNKNOWN' && value.value.length > 0) {
    context.addIssue({ code: 'custom', path: ['value'], message: 'Onbekende elementen hebben geen waarde.' })
  }
  if (value.status !== 'UNKNOWN' && value.value.length === 0) {
    context.addIssue({ code: 'custom', path: ['value'], message: 'Bekende elementen hebben een waarde.' })
  }
  if (value.status === 'HYPOTHESIS' && value.confidence >= 1) {
    context.addIssue({ code: 'custom', path: ['confidence'], message: 'Een hypothese is nooit zeker.' })
  }
})

export const caseUnderstandingSchema = z.object(Object.fromEntries(
  CASE_UNDERSTANDING_ELEMENT_KEYS.map((key) => [key, elementSchema]),
) as Record<(typeof CASE_UNDERSTANDING_ELEMENT_KEYS)[number], typeof elementSchema>).strict().superRefine((value, context) => {
  const managed = new Set<string>(MANAGED_CASE_EXPERTISE_DOMAIN_CODES)
  for (const code of value.candidateExpertiseDomains.value) {
    if (!managed.has(code)) {
      context.addIssue({
        code: 'custom',
        path: ['candidateExpertiseDomains', 'value'],
        message: 'Alleen beheerde expertise-domeincodes zijn toegestaan.',
      })
    }
  }
})

export type CaseUnderstanding = z.infer<typeof caseUnderstandingSchema>

export function emptyCaseUnderstanding(): CaseUnderstanding {
  return Object.freeze(Object.fromEntries(CASE_UNDERSTANDING_ELEMENT_KEYS.map((key) => [key, Object.freeze({
    value: Object.freeze([]),
    evidence: Object.freeze([]),
    confidence: 0,
    status: 'UNKNOWN' as const,
  })])) as unknown as CaseUnderstanding)
}

export const CASE_UNDERSTANDING_ELEMENT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    evidence: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    status: { type: 'string', enum: CASE_UNDERSTANDING_STATUS_CODES },
  },
  required: ['value', 'evidence', 'confidence', 'status'],
} as const)

export const CASE_UNDERSTANDING_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(CASE_UNDERSTANDING_ELEMENT_KEYS.map((key) => [
    key,
    key === 'candidateExpertiseDomains'
      ? {
          ...CASE_UNDERSTANDING_ELEMENT_JSON_SCHEMA,
          properties: {
            ...CASE_UNDERSTANDING_ELEMENT_JSON_SCHEMA.properties,
            value: { type: 'array', items: { type: 'string', enum: MANAGED_CASE_EXPERTISE_DOMAIN_CODES }, maxItems: 12 },
          },
        }
      : CASE_UNDERSTANDING_ELEMENT_JSON_SCHEMA,
  ])),
  required: CASE_UNDERSTANDING_ELEMENT_KEYS,
} as const)
