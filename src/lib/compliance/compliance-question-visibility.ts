import type { ComplianceAnswerMap } from './rule-engine'
import type { Condition as ComplianceCondition } from './compliance-v2-conditions'
import { conditionQuestions, evaluateComplianceV2Condition, isKnownComplianceAnswer } from './compliance-v2-conditions'

type Question = { code: string; required: boolean; visibleWhen?: ComplianceCondition }

// One dependency graph for the browser, validation, evaluation and progress.
// Unknown conditions stay visible; hidden stale answers never become evidence.
export function resolveComplianceQuestions(questions: readonly Question[], raw: ComplianceAnswerMap) {
  const answers = { ...raw }
  const visible = new Set<string>(), visiting = new Set<string>(), visited = new Set<string>()
  const byCode = new Map(questions.map(q => [q.code, q]))
  function visit(q: Question) {
    if (visited.has(q.code)) return
    if (visiting.has(q.code)) throw new Error('Cyclische vraagafhankelijkheid.')
    visiting.add(q.code)
    for (const code of q.visibleWhen ? conditionQuestions(q.visibleWhen) : []) {
      const dependency = byCode.get(code)
      if (!dependency) throw new Error('Onbekende vraagafhankelijkheid.')
      visit(dependency)
    }
    if (!q.visibleWhen || evaluateComplianceV2Condition(q.visibleWhen, answers) !== false) visible.add(q.code)
    else delete answers[q.code]
    visiting.delete(q.code); visited.add(q.code)
  }
  questions.forEach(visit)
  const visibleCodes = questions.filter(q => visible.has(q.code)).map(q => q.code)
  return { answers, visibleCodes, total: visibleCodes.length,
    answered: visibleCodes.filter(code => raw[code] === 'UNKNOWN' || isKnownComplianceAnswer(answers[code])).length }
}
