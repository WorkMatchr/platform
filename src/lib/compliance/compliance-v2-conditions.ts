import { z } from 'zod'
import { complianceConditionSchema, type ComplianceAnswerMap } from './rule-engine'
const code = z.string().min(1).max(80)
const scalar = z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])
export const complianceV2AnswersSchema = z.record(code, z.union([scalar, z.array(scalar).max(50)]))
export function canonicalJson(value: unknown): string {
  const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, x]) => [k, stable(x)])) : v
  return JSON.stringify(stable(value))
}
export function normalizeComplianceV2Answers(raw: unknown) {
  const answers = complianceV2AnswersSchema.parse(raw)
  return Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, Array.isArray(value)
    ? [...new Map(value.map((v) => [JSON.stringify(v), v])).entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v) : value]))
}
export type Condition = z.infer<typeof complianceConditionSchema>
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
