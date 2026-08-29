import { z } from 'zod'
import {
  CASE_UNDERSTANDING_ELEMENT_KEYS,
  caseUnderstandingSchema,
  type CaseUnderstanding,
} from '@/lib/ai-intake-classifier/case-understanding-contract'
import type { ExtractedFact, ExtractedFactStatus } from './context-question-engine-types'
import { compatibilityContextGoals } from './context-goal-catalog'

export const CASE_UNDERSTANDING_VERSION = 'case-understanding/1.0.0' as const
export const INTAKE_ROUTING_KNOWLEDGE_SCOPE = 'INTAKE_ROUTING_KNOWLEDGE' as const

const statusMap: Readonly<Record<CaseUnderstanding['userGoal']['status'], ExtractedFactStatus | 'UNKNOWN'>> = {
  EXPLICIT_INPUT: 'EXPLICIT_INPUT',
  RELIABLE_EXTRACTION: 'RELIABLE_EXTRACTION',
  USER_CONFIRMED: 'USER_CONFIRMED',
  HYPOTHESIS: 'HYPOTHESIS',
  UNKNOWN: 'UNKNOWN',
}

const factCodeByElement: Readonly<Record<(typeof CASE_UNDERSTANDING_ELEMENT_KEYS)[number], string>> = {
  userGoal: 'USER_GOAL',
  organizationContext: 'ORGANIZATION_CONTEXT',
  sectorContext: 'SECTOR_CONTEXT',
  workContext: 'WORK_CONTEXT',
  activities: 'ACTIVITIES',
  peopleAffected: 'PEOPLE_AFFECTED',
  complaintsOrSignals: 'COMPLAINTS_OR_SIGNALS',
  hazards: 'HAZARDS',
  exposureSignals: 'EXPOSURE_SIGNALS',
  equipment: 'EQUIPMENT_CONTEXT',
  substances: 'SUBSTANCES',
  locationContext: 'LOCATION_CONTEXT',
  timePattern: 'TIME_PATTERN',
  recentChanges: 'RECENT_CHANGES',
  incidentContext: 'INCIDENT_CONTEXT',
  existingMeasures: 'EXISTING_MEASURES',
  existingMeasurements: 'EXISTING_MEASUREMENTS',
  existingAssessment: 'EXISTING_ASSESSMENT',
  urgency: 'URGENCY',
  requestedInvestigation: 'REQUESTED_INVESTIGATION',
  requestedProfessional: 'REQUESTED_PROFESSIONAL',
  legalOrComplianceContext: 'LEGAL_OR_COMPLIANCE_CONTEXT',
  multiDisciplinarySignals: 'MULTIDISCIPLINARY_SIGNALS',
  knownFacts: 'KNOWN_FACTS',
  unknownRelevantFacts: 'UNKNOWN_RELEVANT_FACTS',
  candidateExpertiseDomains: 'CANDIDATE_EXPERTISE_DOMAINS',
}

const sharedGoalFactCodeByElement: Partial<Readonly<Record<(typeof CASE_UNDERSTANDING_ELEMENT_KEYS)[number], string>>> = {
  activities: 'WORK_ACTIVITY',
  peopleAffected: 'AFFECTED_SCOPE',
  locationContext: 'LOCATION_PATTERN',
  timePattern: 'DURATION_FREQUENCY',
  recentChanges: 'WORK_ENVIRONMENT_CHANGE',
}

export function parseCaseUnderstanding(value: unknown): CaseUnderstanding {
  return caseUnderstandingSchema.parse(value)
}

export function caseUnderstandingFacts(understanding: CaseUnderstanding | null): readonly ExtractedFact[] {
  if (!understanding) return Object.freeze([])
  const facts: ExtractedFact[] = []
  for (const key of CASE_UNDERSTANDING_ELEMENT_KEYS) {
    const element = understanding[key]
    const status = statusMap[element.status]
    if (status === 'UNKNOWN' || element.value.length === 0) continue
    facts.push(Object.freeze({
      code: factCodeByElement[key],
      value: Object.freeze([...element.value]),
      status,
      confidence: element.confidence,
      evidence: Object.freeze([...element.evidence]),
    }))
    const sharedGoalFactCode = sharedGoalFactCodeByElement[key]
    if (sharedGoalFactCode) {
      facts.push(Object.freeze({
        code: sharedGoalFactCode,
        value: Object.freeze([...element.value]),
        status,
        confidence: element.confidence,
        evidence: Object.freeze([...element.evidence]),
      }))
    }
    if (key === 'candidateExpertiseDomains') {
      for (const domain of element.value) {
        facts.push(Object.freeze({
          code: `EXPERTISE_DOMAIN_${domain}`,
          value: true,
          status,
          confidence: element.confidence,
          evidence: Object.freeze([...element.evidence]),
        }))
      }
    }
  }
  return Object.freeze(facts)
}

export const matchingReadyProfileSchema = z.object({
  version: z.literal('matching-ready-profile/1.0.0'),
  scope: z.literal(INTAKE_ROUTING_KNOWLEDGE_SCOPE),
  assignmentSummary: z.string().min(10).max(1500),
  primaryExpertise: z.string().regex(/^[A-Z0-9_]{2,120}$/),
  conditionalExpertise: z.array(z.object({
    code: z.string().regex(/^[A-Z0-9_]{2,120}$/),
    when: z.string().min(5).max(500),
  }).strict()).max(10),
  requiredSpecialisms: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(10),
  assignmentType: z.string().regex(/^[A-Z0-9_]{2,120}$/),
  relevantSectorExperience: z.array(z.string().min(2).max(240)).max(10),
  riskContext: z.array(z.string().min(2).max(300)).max(20),
  locationContext: z.array(z.string().min(2).max(300)).max(10),
  urgency: z.array(z.string().min(2).max(200)).max(5),
  multidisciplinary: z.boolean(),
  matchingCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).min(1).max(20),
  supportingKnowledgeIds: z.array(z.string().uuid()).min(1).max(30),
}).strict()

export type MatchingReadyProfile = z.infer<typeof matchingReadyProfileSchema>

function confirmedFactSummary(fact: ExtractedFact): string[] {
  const values = Array.isArray(fact.value) ? fact.value : [fact.value]
  if (fact.code === 'SECTOR') {
    return values.map((value) => `Sector: ${String(value).replace(/-/g, ' ')}.`)
  }
  const goal = compatibilityContextGoals.find((candidate) =>
    (candidate.satisfiesFactCodes as readonly string[]).includes(fact.code))
  return values.map((value) => {
    const label = goal?.options.find((option) => option.code === String(value))?.label ?? String(value)
    return goal ? `${goal.text} ${label}.` : label
  })
}

export function buildNeutralAssignmentSummary(
  understanding: CaseUnderstanding,
  facts: readonly ExtractedFact[] = [],
): string {
  const confirmedContext = facts
    .filter((fact) => fact.status === 'USER_CONFIRMED')
    .flatMap(confirmedFactSummary)
  const parts = [
    ...understanding.userGoal.value,
    ...understanding.workContext.value,
    ...understanding.activities.value,
    ...understanding.locationContext.value,
    ...confirmedContext,
  ].map((part) => part.trim()).filter(Boolean)
  return ([...new Set(parts)].join(' ') || 'Ondersteuning gevraagd voor de beschreven werksituatie.').slice(0, 1500)
}
