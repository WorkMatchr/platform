import { z } from 'zod'

export const complianceAnswerScalarSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

export const complianceAnswerValueSchema = z.union([
  complianceAnswerScalarSchema,
  z.array(complianceAnswerScalarSchema).max(50),
])

export type ComplianceAnswerValue = z.infer<typeof complianceAnswerValueSchema>

const questionValueConditionSchema = z.object({
  question: z.string().min(1).max(80),
  equals: complianceAnswerValueSchema.optional(),
  notEquals: complianceAnswerValueSchema.optional(),
  includes: complianceAnswerScalarSchema.optional(),
  exists: z.boolean().optional(),
}).superRefine((value, ctx) => {
  const operators = [value.equals !== undefined, value.notEquals !== undefined, value.includes !== undefined, value.exists !== undefined]
  if (operators.filter(Boolean).length !== 1) {
    ctx.addIssue({ code: 'custom', message: 'Een vraagconditie moet exact één operator bevatten.' })
  }
})

export type ComplianceQuestionValueCondition = z.infer<typeof questionValueConditionSchema>

type ComplianceCondition =
  | ComplianceQuestionValueCondition
  | { all: ComplianceCondition[] }
  | { any: ComplianceCondition[] }
  | { not: ComplianceCondition }

export const complianceConditionSchema: z.ZodType<ComplianceCondition> = z.lazy(() =>
  z.union([
    questionValueConditionSchema,
    z.object({ all: z.array(complianceConditionSchema).min(1).max(50) }),
    z.object({ any: z.array(complianceConditionSchema).min(1).max(50) }),
    z.object({ not: complianceConditionSchema }),
  ]),
)

export const complianceRuleDefinitionSchema = z.object({
  code: z.string().min(1).max(60),
  moduleCode: z.string().regex(/^[CR](0[1-9]|1[0-9]|2[0-3])$/),
  condition: complianceConditionSchema,
  applicability: z.enum(['RELEVANT', 'POSSIBLY_RELEVANT', 'NOT_APPLICABLE']).nullable().optional(),
  assessmentStatus: z.enum(['IN_ORDER', 'ATTENTION_REQUIRED', 'ACTION_REQUIRED', 'NOT_ASSESSED', 'NOT_APPLICABLE']).nullable().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).nullable().optional(),
  assessmentMode: z.enum(['FULL', 'SCREENING', 'SPECIALIST_REQUIRED']),
  findingCode: z.string().min(1).max(80).nullable().optional(),
  findingTitle: z.string().min(1).max(240).nullable().optional(),
  findingBody: z.string().min(1).max(5_000).nullable().optional(),
  recommendedAction: z.string().min(1).max(5_000).nullable().optional(),
  serviceSuggestionCode: z.string().min(1).max(80).nullable().optional(),
  position: z.number().int().positive(),
}).superRefine((rule, ctx) => {
  if (!rule.applicability && !rule.assessmentStatus) {
    ctx.addIssue({ code: 'custom', message: 'Een compliance-regel moet applicability of assessmentStatus opleveren.' })
  }
  const needsFinding = rule.assessmentStatus === 'ATTENTION_REQUIRED' || rule.assessmentStatus === 'ACTION_REQUIRED' || rule.assessmentStatus === 'NOT_ASSESSED'
  if (needsFinding && (!rule.findingCode || !rule.findingTitle || !rule.findingBody)) {
    ctx.addIssue({ code: 'custom', message: 'Deze assessmentstatus vereist een volledige finding.' })
  }
})

export type ComplianceRuleDefinition = z.infer<typeof complianceRuleDefinitionSchema>

export type ComplianceAnswerMap = Readonly<Record<string, ComplianceAnswerValue | undefined>>

function scalarEquals(left: unknown, right: unknown) {
  return Object.is(left, right)
}

function valueEquals(left: ComplianceAnswerValue | undefined, right: ComplianceAnswerValue) {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((item, index) => scalarEquals(item, right[index]))
  }
  return scalarEquals(left, right)
}

export function evaluateComplianceCondition(condition: ComplianceCondition, answers: ComplianceAnswerMap): boolean {
  if ('question' in condition) {
    const current = answers[condition.question]
    if (condition.exists !== undefined) return condition.exists ? current !== undefined : current === undefined
    if (condition.equals !== undefined) return valueEquals(current, condition.equals)
    if (condition.notEquals !== undefined) return !valueEquals(current, condition.notEquals)
    if (condition.includes !== undefined) return Array.isArray(current) && current.some((item) => scalarEquals(item, condition.includes))
    return false
  }
  if ('all' in condition) return condition.all.every((child) => evaluateComplianceCondition(child, answers))
  if ('any' in condition) return condition.any.some((child) => evaluateComplianceCondition(child, answers))
  return !evaluateComplianceCondition(condition.not, answers)
}

export type ComplianceMatchedRule = Readonly<{
  code: string
  moduleCode: string
  applicability?: 'RELEVANT' | 'POSSIBLY_RELEVANT' | 'NOT_APPLICABLE' | null
  assessmentStatus?: 'IN_ORDER' | 'ATTENTION_REQUIRED' | 'ACTION_REQUIRED' | 'NOT_ASSESSED' | 'NOT_APPLICABLE' | null
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | null
  assessmentMode: 'FULL' | 'SCREENING' | 'SPECIALIST_REQUIRED'
  findingCode?: string | null
  findingTitle?: string | null
  findingBody?: string | null
  recommendedAction?: string | null
  serviceSuggestionCode?: string | null
  position: number
}>

export function evaluateComplianceRules(rawRules: readonly unknown[], answers: ComplianceAnswerMap): ComplianceMatchedRule[] {
  return rawRules
    .map((rawRule) => complianceRuleDefinitionSchema.parse(rawRule))
    .filter((rule) => evaluateComplianceCondition(rule.condition, answers))
    .sort((a, b) => a.position - b.position || a.code.localeCompare(b.code))
    .map((rule) => {
      const result = { ...rule }
      delete (result as Partial<typeof result>).condition
      return result
    })
}
