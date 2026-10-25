import { createHash } from 'node:crypto'
import { z } from 'zod'
import { complianceConditionSchema } from './rule-engine'
import type { Condition } from './compliance-v2-conditions'
import { canonicalJson, normalizeComplianceV2Answers, conditionQuestions, isKnownComplianceAnswer, evaluateComplianceV2Condition } from './compliance-v2-conditions'
export { canonicalJson, normalizeComplianceV2Answers, conditionQuestions, isKnownComplianceAnswer, evaluateComplianceV2Condition, complianceV2AnswersSchema } from './compliance-v2-conditions'
import { resolveComplianceQuestions } from './compliance-question-visibility'
import { complianceAssessmentStatuses, complianceApplicabilities, complianceAssessmentModes } from './module-aggregation'

export const COMPLIANCE_V2 = { frameworkCode: 'NL_ARBO_GUIDE', version: '2', guideVersion: '2', reportVersion: '2.0', productCode: 'COMPLIANCE_GUIDE' } as const
export const complianceStatusLabels = {
  IN_ORDER: 'Op orde', ATTENTION_REQUIRED: 'Aandacht nodig', ACTION_REQUIRED: 'Actie vereist',
  NOT_ASSESSED: 'Niet beoordeeld', NOT_APPLICABLE: 'Niet van toepassing',
} as const
const checksum = z.string().regex(/^[a-f0-9]{64}$/)
const frameworkVersion = z.string().max(32).regex(/^2(?:\.\d+){0,2}$/)
const code = z.string().min(1).max(80)
export const complianceChecksum = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
export const complianceV2SourceSchema = z.object({
  id: z.string().uuid(), title: z.string().min(1).max(300), publisher: z.string().min(1).max(200),
  url: z.string().url().startsWith('https://'), reviewedAt: z.string().date(),
  category: z.enum(['LEGISLATION', 'GUIDANCE', 'SUPPLEMENTARY']),
  sourceVersionId: z.string().uuid(), sourceChecksum: checksum, claimId: z.string().uuid(), claimChecksum: checksum,
}).strict()
const questionSchema = z.object({
  id: z.string().uuid(), code, prompt: z.string().min(1).max(1000), required: z.boolean(),
  helpText: z.string().max(2000).optional(),
  visibleWhen: complianceConditionSchema.optional(),
  inputType: z.enum(['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'NUMBER', 'DATE', 'SHORT_TEXT']),
  options: z.array(z.object({ value: z.string().min(1).max(80), label: z.string().min(1).max(200), exclusive: z.boolean() }).strict()).max(100),
}).strict()
export const complianceV2RuleSchema = z.object({
  id: z.string().uuid(), code, condition: complianceConditionSchema,
  applicability: z.enum(complianceApplicabilities).nullable(), status: z.enum(complianceAssessmentStatuses).nullable(),
  mode: z.enum(complianceAssessmentModes), basis: z.enum(['LEGAL_REQUIREMENT', 'PRACTICAL_RECOMMENDATION']),
  explanation: z.string().min(1).max(2000), nextStep: z.string().min(1).max(2000),
  sources: z.array(complianceV2SourceSchema).min(1).max(30),
}).strict()
export const complianceV2DefinitionSchema = z.object({
  id: z.string().uuid(), frameworkCode: z.literal(COMPLIANCE_V2.frameworkCode), version: frameworkVersion,
  title: z.string().min(1).max(160), disclaimer: z.string().min(1).max(3000),
  modules: z.array(z.object({
    code: z.string().regex(/^(C(0[1-9]|10)|R(0[1-9]|1[0-9]|2[0-3]))$/), title: z.string().min(1).max(200),
    questions: z.array(questionSchema).min(1).max(100), rules: z.array(complianceV2RuleSchema).min(1).max(100),
  }).strict()).min(1).max(33),
}).strict().superRefine((d, ctx) => {
  for (const values of [d.modules.map(m => m.code), d.modules.flatMap(m => m.questions.map(q => q.code)), d.modules.flatMap(m => m.rules.map(r => r.code))]) {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', message: 'Dubbele versie-identiteit.' })
  }
  try { resolveComplianceQuestions(d.modules.flatMap(m => m.questions), {}) } catch { ctx.addIssue({ code: 'custom', message: 'Ongeldige vraagafhankelijkheid.' }) }
  if (d.version !== '2.1' && d.modules.some(m => m.questions.some(q => q.visibleWhen || q.helpText))) ctx.addIssue({ code: 'custom', message: 'Vraagmetadata vereist versie 2.1.' })
  for (const m of d.modules) for (const r of m.rules) {
    if (conditionQuestions(r.condition).some(q => !(d.version === '2.1' ? d.modules.flatMap(x => x.questions) : m.questions).some(x => x.code === q))) ctx.addIssue({ code: 'custom', message: 'Onbekende regelvraag.' })
  }
})
export type ComplianceV2Definition = z.infer<typeof complianceV2DefinitionSchema>
// Exclusions must be positive, fully known facts, never negation/absence.
function positiveExclusion(c: Condition): boolean {
  if ('question' in c) return (c.equals !== undefined && isKnownComplianceAnswer(c.equals)) || (c.includes !== undefined && isKnownComplianceAnswer(c.includes))
  if ('not' in c) return false
  return ('all' in c ? c.all : c.any).every(positiveExclusion)
}
const resultSchema = z.object({
  id: code, title: z.string().min(1).max(200), status: z.enum(complianceAssessmentStatuses), statusLabel: z.string(),
  applicability: z.enum(complianceApplicabilities), sufficientlyAssessed: z.boolean(), missingQuestionCodes: z.array(code),
  explanation: z.string().min(1), nextStep: z.string().min(1), relevance: z.string().min(1),
  sources: z.array(complianceV2SourceSchema),
  evidence: z.array(z.object({ ruleId: z.string().uuid(), ruleCode: code, ruleChecksum: checksum,
    basis: z.enum(['LEGAL_REQUIREMENT', 'PRACTICAL_RECOMMENDATION']), explanation: z.string(), nextStep: z.string(),
  }).strict()),
}).strict()
export const complianceV2ReportSchema = z.object({
  schemaVersion: z.literal(2), productCode: z.literal(COMPLIANCE_V2.productCode), tier: z.literal('BASIC'),
  assessmentVersion: z.literal(2), reportVersion: z.literal(COMPLIANCE_V2.reportVersion),
  organizationName: z.string().max(160).nullable(), scannedAt: z.string().datetime(),
  framework: z.object({ id: z.string().uuid(), frameworkCode: z.literal(COMPLIANCE_V2.frameworkCode), version: frameworkVersion, checksum }).strict(),
  definitionSnapshot: complianceV2DefinitionSchema,
  summary: z.object({ order: z.number().int().nonnegative(), attention: z.number().int().nonnegative(), action: z.number().int().nonnegative(), notAssessed: z.number().int().nonnegative(), notApplicable: z.number().int().nonnegative() }).strict(),
  results: z.array(resultSchema).min(1).max(33), sources: z.array(complianceV2SourceSchema), disclaimer: z.string().min(1),
}).strict().superRefine((r, ctx) => {
  if (r.framework.id !== r.definitionSnapshot.id || r.framework.version !== r.definitionSnapshot.version || r.framework.checksum !== complianceChecksum(r.definitionSnapshot)) ctx.addIssue({ code: 'custom', message: 'Frameworksnapshot wijkt af.' })
  const keys = { IN_ORDER: 'order', ATTENTION_REQUIRED: 'attention', ACTION_REQUIRED: 'action', NOT_ASSESSED: 'notAssessed', NOT_APPLICABLE: 'notApplicable' } as const
  for (const [status, key] of Object.entries(keys)) if (r.summary[key] !== r.results.filter(x => x.status === status).length) ctx.addIssue({ code: 'custom', message: 'Samenvatting wijkt af.' })
  for (const x of r.results) if (x.statusLabel !== complianceStatusLabels[x.status]) ctx.addIssue({ code: 'custom', message: 'Statuslabel wijkt af.' })
})
export type ComplianceV2Report = z.infer<typeof complianceV2ReportSchema>

export function buildComplianceV2Report(rawDefinition: unknown, rawAnswers: unknown, context: { organizationName: string | null; scannedAt: string }): ComplianceV2Report {
  const definition = complianceV2DefinitionSchema.parse(rawDefinition)
  const answers = normalizeComplianceV2Answers(rawAnswers)
  const questions = definition.modules.flatMap(m => m.questions)
  for (const [key, value] of Object.entries(answers)) {
    const q = questions.find(q => q.code === key)
    if (!q) throw new Error('Onbekende v2-vraag.')
    if (Array.isArray(value) && value.length > 1 && value.some(v => !isKnownComplianceAnswer(v))) throw new Error('Tegenstrijdige onbekende antwoordkeuze.')
    if (!isKnownComplianceAnswer(value)) continue
    const valid = q.inputType === 'MULTI_SELECT' ? Array.isArray(value) && value.every(v => q.options.some(o => o.value === v)) && !(value.length > 1 && q.options.some(o => o.exclusive && value.includes(o.value)))
      : q.inputType === 'SINGLE_SELECT' ? q.options.some(o => o.value === value)
      : q.inputType === 'BOOLEAN' ? typeof value === 'boolean'
      : q.inputType === 'NUMBER' ? typeof value === 'number'
      : q.inputType === 'DATE' ? z.string().date().safeParse(value).success : typeof value === 'string'
    if (!valid) throw new Error('Ongeldig v2-antwoord.')
  }
  const resolution = resolveComplianceQuestions(questions, answers)
  const effectiveAnswers = resolution.answers
  const results = definition.modules.map(m => {
    const required = m.questions.filter(q => q.required && resolution.visibleCodes.includes(q.code))
    const matched = m.rules.filter(r => evaluateComplianceV2Condition(r.condition, effectiveAnswers) === true)
    const missing = required.filter(q => !isKnownComplianceAnswer(effectiveAnswers[q.code]) || (definition.version === '2.1' && !matched.some(r => r.status !== null && r.status !== 'NOT_ASSESSED' && r.status !== 'NOT_APPLICABLE' && conditionQuestions(r.condition).includes(q.code)))).map(q => q.code)
    const action = matched.some(r => r.status === 'ACTION_REQUIRED')
    const attention = matched.some(r => r.status === 'ATTENTION_REQUIRED')
    const exclusion = matched.some(r => r.applicability === 'NOT_APPLICABLE' && r.status === 'NOT_APPLICABLE'
      && positiveExclusion(r.condition) && conditionQuestions(r.condition).every(q => isKnownComplianceAnswer(effectiveAnswers[q])))
    const relevant = action || attention || matched.some(r => r.applicability === 'RELEVANT' || r.status === 'IN_ORDER')
    const excluded = exclusion && !relevant && !matched.some(r => r.applicability === 'POSSIBLY_RELEVANT' || r.mode === 'SPECIALIST_REQUIRED' || r.status === 'NOT_ASSESSED')
    const covered = required.every(q => matched.some(r => r.status !== null && r.status !== 'NOT_ASSESSED' && r.status !== 'NOT_APPLICABLE' && conditionQuestions(r.condition).includes(q.code)))
    const sufficientlyAssessed = excluded || (missing.length === 0 && !matched.some(r => r.mode === 'SPECIALIST_REQUIRED' || r.status === 'NOT_ASSESSED' || r.applicability === 'POSSIBLY_RELEVANT') && covered)
    const status = action ? 'ACTION_REQUIRED' : attention ? 'ATTENTION_REQUIRED' : excluded ? 'NOT_APPLICABLE'
      : sufficientlyAssessed && relevant && matched.some(r => r.status === 'IN_ORDER') ? 'IN_ORDER' : 'NOT_ASSESSED'
    const sources = [...new Map(matched.flatMap(r => r.sources).map(s => [s.id, s])).values()]
    return { id: m.code, title: m.title, status, statusLabel: complianceStatusLabels[status],
      applicability: excluded ? 'NOT_APPLICABLE' as const : relevant ? 'RELEVANT' as const : 'POSSIBLY_RELEVANT' as const,
      sufficientlyAssessed, missingQuestionCodes: missing,
      explanation: matched.map(r => r.explanation).join('\n') || 'Er is onvoldoende informatie voor een beoordeling.',
      nextStep: matched.map(r => r.nextStep).join('\n') || 'Vul de ontbrekende informatie aan of laat de situatie beoordelen.',
      relevance: 'Indicatieve beoordeling op basis van de vastgelegde antwoorden en methodiek.', sources,
      evidence: matched.map(r => ({ ruleId: r.id, ruleCode: r.code, ruleChecksum: complianceChecksum(r), basis: r.basis, explanation: r.explanation, nextStep: r.nextStep })),
    }
  })
  const count = (s: string) => results.filter(r => r.status === s).length
  return complianceV2ReportSchema.parse({ schemaVersion: 2, productCode: COMPLIANCE_V2.productCode, tier: 'BASIC', assessmentVersion: 2, reportVersion: '2.0', ...context,
    framework: { id: definition.id, frameworkCode: definition.frameworkCode, version: definition.version, checksum: complianceChecksum(definition) }, definitionSnapshot: definition,
    summary: { order: count('IN_ORDER'), attention: count('ATTENTION_REQUIRED'), action: count('ACTION_REQUIRED'), notAssessed: count('NOT_ASSESSED'), notApplicable: count('NOT_APPLICABLE') },
    results, sources: [...new Map(results.flatMap(r => r.sources).map(s => [s.id, s])).values()], disclaimer: definition.disclaimer,
  })
}
