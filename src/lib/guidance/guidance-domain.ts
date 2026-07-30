/**
 * Stabiele, persistence-onafhankelijke domeincontracten uit ADR-021.
 *
 * Deze module bevat bewust geen beslisregels, services, databasekoppelingen
 * of conversies naar bestaande intake-, opdracht- of matchingmodellen.
 */
import type { ProfessionalDisciplineCode } from './professional-disciplines'

export const GUIDANCE_OUTCOME_SCHEMA_VERSION =
  'guidance-outcome/1.2.0' as const
export const PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION =
  'professional-requirement/1.2.0' as const
export const PROFESSIONAL_ADVICE_SCHEMA_VERSION =
  'professional-advice/1.1.0' as const

export const guidanceSourceKinds = [
  'PUBLIC_INTAKE_DRAFT',
  'TENANT_INTAKE',
  'PUBLISHED_KNOWLEDGE',
  'PUBLISHED_RULE',
  'AUTHORIZED_CORRECTION',
] as const

export const guidanceConfirmationStatuses = [
  'UNCONFIRMED',
  'CONFIRMED',
  'CORRECTED',
] as const

export const guidanceOutcomeStatuses = [
  'DRAFT',
  'PRESENTED',
  'CONFIRMED',
  'CORRECTED',
] as const

export const contextFactValueTypes = [
  'TEXT',
  'NUMBER',
  'BOOLEAN',
  'DATE',
  'CODE',
  'CODE_LIST',
] as const

export const uncertaintyReasons = [
  'UNKNOWN',
  'UNCONFIRMED',
  'DEFERRED',
] as const

export const professionalSupportNeedStates = [
  'NOT_DETERMINED',
  'NOT_INDICATED',
  'POSSIBLE',
  'CONFIRMED',
] as const

export const professionalRequirementStatuses = [
  'DRAFT',
  'CONFIRMED',
  'FROZEN',
] as const

export const professionalRequirementKinds = [
  'CAPABILITY',
  'QUALIFICATION',
  'SECTOR',
  'WORK_AREA',
  'DELIVERY_MODE',
  'COMPLIANCE',
] as const

export const professionalRequirementPriorities = [
  'REQUIRED',
  'PREFERRED',
] as const

export const professionalAdvicePriorities = [
  'PRIMARY',
  'ADDITIONAL',
  'POSSIBLE',
] as const

export const dominantContexts = [
  'EXPOSURE',
  'LARGE_SCALE_STORAGE',
  'FIRE_SAFETY',
  'ENVIRONMENTAL_COMPLIANCE',
  'INCIDENT_RESPONSE',
  'OCCUPATIONAL_HEALTH',
  'ERGONOMICS',
  'MACHINE_SAFETY',
  'PSYCHOSOCIAL_WORKLOAD',
  'WORK_ABILITY',
  'ASBEST',
  'OPERATIONAL_SAFETY',
  'COMPLEX_OPERATIONAL_SAFETY',
  'EMERGENCY_PREPAREDNESS',
  'GENERAL_RISK_ASSESSMENT',
  'UNKNOWN',
] as const

export const professionalAdviceRiskDomains = [
  'EMPLOYEE_EXPOSURE',
  'STORAGE_SAFETY',
  'FIRE_AND_EXPLOSION_SAFETY',
  'ENVIRONMENT_AND_PERMITS',
  'PGS_APPLICABILITY',
  'SOIL_PROTECTION',
  'EMERGENCY_SCENARIOS',
  'LOADING_UNLOADING_TRANSFER',
  'INCIDENT_INVESTIGATION',
  'WORK_AND_HEALTH',
  'PHYSICAL_WORKLOAD',
  'EMERGENCY_RESPONSE',
  'RISK_ASSESSMENT',
  'MACHINE_AND_WORK_EQUIPMENT_SAFETY',
  'PSYCHOSOCIAL_WORKLOAD',
  'WORK_ABILITY_AND_REINTEGRATION',
  'ASBEST_EXPOSURE',
  'OPERATIONAL_SAFETY',
] as const

export const guidanceOutcomeSpecificities = [
  'SPECIFIC',
  'BROAD',
  'SAFE_FALLBACK',
] as const

export type GuidanceSourceKind = (typeof guidanceSourceKinds)[number]
export type GuidanceConfirmationStatus =
  (typeof guidanceConfirmationStatuses)[number]
export type GuidanceOutcomeStatus = (typeof guidanceOutcomeStatuses)[number]
export type ContextFactValueType = (typeof contextFactValueTypes)[number]
export type UncertaintyReason = (typeof uncertaintyReasons)[number]
export type ProfessionalSupportNeedState =
  (typeof professionalSupportNeedStates)[number]
export type ProfessionalRequirementStatus =
  (typeof professionalRequirementStatuses)[number]
export type ProfessionalRequirementKind =
  (typeof professionalRequirementKinds)[number]
export type ProfessionalRequirementPriority =
  (typeof professionalRequirementPriorities)[number]
export type ProfessionalAdvicePriority =
  (typeof professionalAdvicePriorities)[number]
export type DominantContext = (typeof dominantContexts)[number]
export type ProfessionalAdviceRiskDomain =
  (typeof professionalAdviceRiskDomains)[number]
export type GuidanceOutcomeSpecificity =
  (typeof guidanceOutcomeSpecificities)[number]

export type GuidanceSourceReference = Readonly<{
  kind: GuidanceSourceKind
  referenceId: string
  version: string
}>

export type GuidanceRuleReference = Readonly<{
  code: string
  version: string
}>

export type GuidanceProvenance = Readonly<{
  sources: readonly GuidanceSourceReference[]
  rules: readonly GuidanceRuleReference[]
}>

export type GuidanceExecutionProvenance = Readonly<{
  contract: Readonly<{
    schemaVersion: string
    id: string
    version: number
  }>
  ruleSetVersion: string
  engineVersion: string
}>

export type GuidanceConfirmation =
  | Readonly<{
      status: 'UNCONFIRMED'
    }>
  | Readonly<{
      status: Exclude<GuidanceConfirmationStatus, 'UNCONFIRMED'>
      actorType: 'VISITOR_SESSION' | 'USER'
      actorReference: string | null
      confirmedAt: string
    }>

export type Situation = Readonly<{
  code: string
  description: string
  provenance: GuidanceProvenance
}>

export type HelpRequest = Readonly<{
  originalInput: string
  confirmedDescription: string | null
  confirmation: GuidanceConfirmation
}>

export type ContextFactValue =
  | string
  | number
  | boolean
  | readonly string[]

export type ContextFact = Readonly<{
  key: string
  valueType: ContextFactValueType
  value: ContextFactValue
  status: 'CONFIRMED' | 'UNCONFIRMED'
  provenance: GuidanceProvenance
}>

export type Uncertainty = Readonly<{
  key: string
  reason: UncertaintyReason
  description: string
  sourceQuestionKey: string | null
  provenance: GuidanceProvenance
}>

export type GuidanceQuestion = Readonly<{
  key: string
  version: number
  decisionPurpose: string
  resultingFactKeys: readonly string[]
  resultingUncertaintyKeys: readonly string[]
}>

export type KnowledgeNeed = Readonly<{
  code: string
  topicCodes: readonly string[]
  reasonFactKeys: readonly string[]
  provenance: GuidanceProvenance
}>

export type SolutionDirection = Readonly<{
  code: string
  description: string
  reasonFactKeys: readonly string[]
  provenance: GuidanceProvenance
}>

export type ProfessionalSupportNeed = Readonly<{
  id: string
  state: ProfessionalSupportNeedState
  reasonFactKeys: readonly string[]
  reasonUncertaintyKeys: readonly string[]
  confirmation: GuidanceConfirmation
  provenance: GuidanceProvenance
}>

export type ProfessionalRequirementCriterion = Readonly<{
  code: string
  kind: ProfessionalRequirementKind
  priority: ProfessionalRequirementPriority
  valueCodes: readonly string[]
  provenance: GuidanceProvenance
}>

export type ProfessionalRequirement = Readonly<{
  schemaVersion: typeof PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION
  id: string
  version: number
  guidanceOutcomeId: string
  professionalSupportNeedId: string
  status: ProfessionalRequirementStatus
  professionalType: ProfessionalDisciplineCode
  priority: ProfessionalAdvicePriority
  reason: string
  expertise: readonly string[]
  matchingTags: readonly string[]
  criteria: readonly ProfessionalRequirementCriterion[]
  createdAt: string
  confirmation: GuidanceConfirmation
  checksum: string | null
}>

export type GuidanceKnowledgeReference = Readonly<{
  contentId: string
}>

export type GuidanceSourceContentReference = Readonly<{
  sourceId: string
}>

export type ProfessionalAdvice = Readonly<{
  schemaVersion: typeof PROFESSIONAL_ADVICE_SCHEMA_VERSION
  ruleSetVersion: string
  appliedRuleCode: string
  situationSummary: string
  adviceTitle: string
  adviceBody: string
  adviceReasons: readonly string[]
  selfActions: readonly string[]
  dominantContext: DominantContext
  relevantRiskDomains: readonly ProfessionalAdviceRiskDomain[]
  primaryProfessionalRequirement: ProfessionalRequirement | null
  additionalProfessionalRequirements: readonly ProfessionalRequirement[]
  possibleProfessionalRequirements: readonly ProfessionalRequirement[]
  knowledgeReferences: readonly GuidanceKnowledgeReference[]
  sourceReferences: readonly GuidanceSourceContentReference[]
  disclaimer: string
  outcomeSpecificity: GuidanceOutcomeSpecificity
}>

export type GuidanceOutcome = Readonly<{
  schemaVersion: typeof GUIDANCE_OUTCOME_SCHEMA_VERSION
  id: string
  version: number
  source: GuidanceSourceReference
  questionSetVersion: string
  ruleSetVersion: string
  executionProvenance: GuidanceExecutionProvenance
  status: GuidanceOutcomeStatus
  summary: string
  situation: Situation
  helpRequest: HelpRequest
  facts: readonly ContextFact[]
  uncertainties: readonly Uncertainty[]
  relevantTopicCodes: readonly string[]
  knowledgeNeeds: readonly KnowledgeNeed[]
  solutionDirections: readonly SolutionDirection[]
  professionalSupportNeed: ProfessionalSupportNeed
  professionalRequirements: readonly ProfessionalRequirement[]
  professionalAdvice: ProfessionalAdvice
  confirmation: GuidanceConfirmation
  createdAt: string
  checksum: string | null
}>
