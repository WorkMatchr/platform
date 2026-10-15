import { createHash } from 'node:crypto'
import { z } from 'zod'
import { complianceConditionSchema, type ComplianceAnswerMap } from './rule-engine'
import { complianceAssessmentStatuses, complianceApplicabilities, complianceAssessmentModes } from './module-aggregation'

export const COMPLIANCE_V2 = { frameworkCode: 'NL_ARBO_GUIDE', version: '2', guideVersion: '2', reportVersion: '2.0', productCode: 'COMPLIANCE_GUIDE' } as const
export const complianceStatusLabels = {
  IN_ORDER: 'Op orde', ATTENTION_REQUIRED: 'Aandacht nodig', ACTION_REQUIRED: 'Actie vereist',
  NOT_ASSESSED: 'Niet beoordeeld', NOT_APPLICABLE: 'Niet van toepassing',
} as const
const checksum = z.string().regex(/^[a-f0-9]{64}$/)
const frameworkVersion = z.string().max(32).regex(/^2(?:\.\d+){0,2}$/)
const code = z.string().min(1).max(80)
const scalar = z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])
export const complianceV2AnswersSchema = z.record(code, z.union([scalar, z.array(scalar).max(50)]))
export function canonicalJson(value: unknown): string {
  const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, x]) => [k, stable(x)])) : v
  return JSON.stringify(stable(value))
}
export const complianceChecksum = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
export function normalizeComplianceV2Answers(raw: unknown) {
  const answers = complianceV2AnswersSchema.parse(raw)
  return Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, Array.isArray(value)
    ? [...new Map(value.map((v) => [JSON.stringify(v), v])).entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v) : value]))
}
export const complianceV2SourceSchema = z.object({
  id: z.string().uuid(), title: z.string().min(1).max(300), publisher: z.string().min(1).max(200),
  url: z.string().url().startsWith('https://'), reviewedAt: z.string().date(),
  category: z.enum(['LEGISLATION', 'GUIDANCE', 'SUPPLEMENTARY']),
  sourceVersionId: z.string().uuid(), sourceChecksum: checksum, claimId: z.string().uuid(), claimChecksum: checksum,
}).strict()
const questionSchema = z.object({
  id: z.string().uuid(), code, prompt: z.string().min(1).max(1000), required: z.boolean(),
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
  for (const m of d.modules) for (const r of m.rules) {
    if (conditionQuestions(r.condition).some(q => !m.questions.some(x => x.code === q))) ctx.addIssue({ code: 'custom', message: 'Onbekende regelvraag.' })
  }
})
export type ComplianceV2Definition = z.infer<typeof complianceV2DefinitionSchema>
type Condition = z.infer<typeof complianceConditionSchema>
export function conditionQuestions(c: Condition): string[] {
  if ('question' in c) return [c.question]
  if ('not' in c) return conditionQuestions(c.not)
  return ('all' in c ? c.all : c.any).flatMap(conditionQuestions)
}
export function isKnownComplianceAnswer(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !['UNKNOWN', 'SKIPPED', 'SKIPPED_DEPENDENCY'].includes(String(value))
    && (!Array.isArray(value) || (value.length > 0 && value.every(isKnownComplianceAnswer)))
}
// V2 only: three-valued logic. Negation never turns unknown/missing into evidence.
export function evaluateComplianceV2Condition(c: Condition, answers: ComplianceAnswerMap): boolean | null {
  if ('question' in c) {
    const value = answers[c.question]
    if (!isKnownComplianceAnswer(value)) return null
    if (c.exists !== undefined) return c.exists
    if (c.equals !== undefined) return canonicalJson(normalizeComplianceV2Answers({ v: value }).v) === canonicalJson(normalizeComplianceV2Answers({ v: c.equals }).v)
    if (c.notEquals !== undefined) return canonicalJson(normalizeComplianceV2Answers({ v: value }).v) !== canonicalJson(normalizeComplianceV2Answers({ v: c.notEquals }).v)
    return Array.isArray(value) && value.some(v => Object.is(v, c.includes))
  }
  if ('not' in c) { const result = evaluateComplianceV2Condition(c.not, answers); return result === null ? null : !result }
  const results = ('all' in c ? c.all : c.any).map(x => evaluateComplianceV2Condition(x, answers))
  return 'all' in c ? (results.includes(false) ? false : results.includes(null) ? null : true)
    : (results.includes(true) ? true : results.includes(null) ? null : false)
}
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
  const results = definition.modules.map(m => {
    const matched = m.rules.filter(r => evaluateComplianceV2Condition(r.condition, answers) === true)
    const missing = m.questions.filter(q => q.required && !isKnownComplianceAnswer(answers[q.code])).map(q => q.code)
    const action = matched.some(r => r.status === 'ACTION_REQUIRED')
    const attention = matched.some(r => r.status === 'ATTENTION_REQUIRED')
    const exclusion = matched.some(r => r.applicability === 'NOT_APPLICABLE' && r.status === 'NOT_APPLICABLE'
      && positiveExclusion(r.condition) && conditionQuestions(r.condition).every(q => isKnownComplianceAnswer(answers[q])))
    const relevant = action || attention || matched.some(r => r.applicability === 'RELEVANT' || r.status === 'IN_ORDER')
    const excluded = exclusion && !relevant && !matched.some(r => r.applicability === 'POSSIBLY_RELEVANT' || r.mode === 'SPECIALIST_REQUIRED' || r.status === 'NOT_ASSESSED')
    const covered = m.questions.filter(q => q.required).every(q => matched.some(r => r.status !== null && r.status !== 'NOT_ASSESSED' && r.status !== 'NOT_APPLICABLE' && conditionQuestions(r.condition).includes(q.code)))
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
