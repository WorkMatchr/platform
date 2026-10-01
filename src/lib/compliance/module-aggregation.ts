import type { ComplianceMatchedRule } from './rule-engine'

export const complianceAssessmentStatuses = ['IN_ORDER', 'ATTENTION_REQUIRED', 'ACTION_REQUIRED', 'NOT_ASSESSED', 'NOT_APPLICABLE'] as const
export const compliancePriorities = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] as const
export const complianceApplicabilities = ['RELEVANT', 'POSSIBLY_RELEVANT', 'NOT_APPLICABLE'] as const
export const complianceAssessmentModes = ['FULL', 'SCREENING', 'SPECIALIST_REQUIRED'] as const

export type ComplianceAssessmentStatus = (typeof complianceAssessmentStatuses)[number]
export type CompliancePriority = (typeof compliancePriorities)[number]
export type ComplianceApplicability = (typeof complianceApplicabilities)[number]
export type ComplianceAssessmentMode = (typeof complianceAssessmentModes)[number]

const statusRank: Record<ComplianceAssessmentStatus, number> = {
  NOT_APPLICABLE: 0,
  IN_ORDER: 1,
  NOT_ASSESSED: 2,
  ATTENTION_REQUIRED: 3,
  ACTION_REQUIRED: 4,
}

const priorityRank: Record<CompliancePriority, number> = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
}

const modeRank: Record<ComplianceAssessmentMode, number> = {
  FULL: 1,
  SCREENING: 2,
  SPECIALIST_REQUIRED: 3,
}

export type ComplianceModuleAggregationInput = Readonly<{
  moduleCode: string
  matchedRules: readonly ComplianceMatchedRule[]
  requiredQuestionCodes: readonly string[]
  answeredQuestionCodes: ReadonlySet<string>
}>

export type ComplianceModuleAggregation = Readonly<{
  moduleCode: string
  applicability: ComplianceApplicability
  assessmentStatus: ComplianceAssessmentStatus
  priority: CompliancePriority | null
  assessmentMode: ComplianceAssessmentMode
  sufficientlyAssessed: boolean
  matchedRuleCodes: readonly string[]
}>

function strongest<T extends string>(values: readonly T[], rank: Record<T, number>): T | undefined {
  return values.reduce<T | undefined>((current, value) => {
    if (!current || rank[value] > rank[current]) return value
    return current
  }, undefined)
}

export function aggregateComplianceModule(input: ComplianceModuleAggregationInput): ComplianceModuleAggregation {
  const rules = input.matchedRules.filter((rule) => rule.moduleCode === input.moduleCode)

  const applicabilityValues = rules.flatMap((rule) => rule.applicability ? [rule.applicability] : [])
  let applicability: ComplianceApplicability = 'POSSIBLY_RELEVANT'
  if (applicabilityValues.includes('RELEVANT')) applicability = 'RELEVANT'
  else if (applicabilityValues.length > 0 && applicabilityValues.every((value) => value === 'NOT_APPLICABLE')) applicability = 'NOT_APPLICABLE'

  const missingRequiredQuestions = input.requiredQuestionCodes.filter((code) => !input.answeredQuestionCodes.has(code))
  const ruleStatuses = rules.flatMap((rule) => rule.assessmentStatus ? [rule.assessmentStatus] : [])
  const ruleModes = rules.map((rule) => rule.assessmentMode)
  const priorityValues = rules.flatMap((rule) => rule.priority ? [rule.priority] : [])

  const assessmentMode = strongest(ruleModes, modeRank) ?? 'FULL'
  const hasSpecialistBlock = assessmentMode === 'SPECIALIST_REQUIRED'
  const sufficientlyAssessed = applicability === 'NOT_APPLICABLE'
    ? true
    : missingRequiredQuestions.length === 0 && !hasSpecialistBlock

  let assessmentStatus: ComplianceAssessmentStatus
  if (applicability === 'NOT_APPLICABLE') {
    assessmentStatus = 'NOT_APPLICABLE'
  } else {
    const strongestStatus = strongest(ruleStatuses, statusRank)
    if (!sufficientlyAssessed && (!strongestStatus || strongestStatus === 'IN_ORDER')) {
      assessmentStatus = 'NOT_ASSESSED'
    } else {
      assessmentStatus = strongestStatus ?? 'NOT_ASSESSED'
    }
  }

  return {
    moduleCode: input.moduleCode,
    applicability,
    assessmentStatus,
    priority: strongest(priorityValues, priorityRank) ?? null,
    assessmentMode,
    sufficientlyAssessed,
    matchedRuleCodes: rules.map((rule) => rule.code),
  }
}
