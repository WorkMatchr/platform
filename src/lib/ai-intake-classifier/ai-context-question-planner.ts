import { z } from 'zod'
import type { AIClassifierOutput, AIIntakeSubjectCode } from './ai-classifier-contract'
import { aiContextQuestionCatalog, getAIContextQuestion, type AIContextQuestion } from './ai-context-question-catalog'
import { selectRIEContextQuestionKeys } from './rie-context-profile'

export const AI_CONTEXT_QUESTION_LIMIT = 3 as const
const schema = z.object({ questionKeys: z.array(z.string()).max(AI_CONTEXT_QUESTION_LIMIT) }).strict()
export type AIContextQuestionPlannerOutput = Readonly<{ questionKeys: readonly string[] }>

export function parseAIContextQuestionPlannerOutput(value: unknown): AIContextQuestionPlannerOutput {
  const parsed = schema.parse(value)
  if (new Set(parsed.questionKeys).size !== parsed.questionKeys.length) throw new Error('AI_CONTEXT_QUESTION_DUPLICATE')
  for (const key of parsed.questionKeys) if (!getAIContextQuestion(key)) throw new Error('AI_CONTEXT_QUESTION_UNKNOWN')
  return Object.freeze({ questionKeys: Object.freeze([...parsed.questionKeys]) })
}

function containsKnownFact(input: string, key: string): boolean {
  const text = input.toLocaleLowerCase('nl-NL')
  return (key === 'context_rie_status' && /(nieuwe?\s+ri&e|ri&e\s+(nodig|opstellen|actualiseren|controleren|toetsen))/.test(text))
    || (key === 'context_employee_count' && /\b\d+\s+(medewerkers|werknemers)\b/.test(text))
    || (key === 'context_location_count' && /\b\d+\s+(locaties|vestigingen)\b/.test(text))
    || (key === 'context_preferred_start' && /(zo snel mogelijk|binnen (vier|\d+) weken|binnen (drie|\d+) maanden)/.test(text))
    || (key === 'context_affected_scope' && /(meerdere|verschillende|veel) medewerkers/.test(text))
    || (key === 'context_existing_investigation' && /(ri&e|onderzoek).{0,30}(uitgevoerd|gedaan|opgenomen)/.test(text))
}

const semanticQuestionGoals = Object.freeze({
  EMPLOYEE_PRESENCE_OR_COUNT: Object.freeze([
    'context_employee_count',
    'rie_has_employees',
  ]),
})

function unavailableSemanticQuestionKeys(
  questionKeys: readonly string[],
): ReadonlySet<string> {
  const unavailable = new Set(questionKeys)
  for (const equivalentKeys of Object.values(semanticQuestionGoals)) {
    if (equivalentKeys.some((key) => unavailable.has(key))) {
      for (const key of equivalentKeys) unavailable.add(key)
    }
  }
  return unavailable
}

export function selectSafeAIContextQuestions(input: {
  originalInput: string
  classification: AIClassifierOutput | null
  answeredQuestionKeys: readonly string[]
  askedQuestionKeys: readonly string[]
  remainingQuestionBudget: number
  proposedQuestionKeys?: readonly string[]
}): readonly AIContextQuestion[] {
  if (!input.classification || input.classification.confidence === 'LOW' || input.classification.primarySubject === 'UNKNOWN') return Object.freeze([])
  const subject = input.classification.primarySubject as AIIntakeSubjectCode
  const configuredQuestionKeys = subject === 'RIE'
    ? selectRIEContextQuestionKeys(input.originalInput)
    : input.proposedQuestionKeys ?? aiContextQuestionCatalog
      .filter((q) => (q.subjectCodes as readonly AIIntakeSubjectCode[]).includes(subject))
      .map((q) => q.questionKey)
  const allowed = new Set(configuredQuestionKeys)
  const unavailable = unavailableSemanticQuestionKeys([
    ...input.answeredQuestionKeys,
    ...input.askedQuestionKeys,
  ])
  const candidates = subject === 'RIE'
    ? configuredQuestionKeys.map(getAIContextQuestion).filter((question): question is AIContextQuestion => question !== null)
    : aiContextQuestionCatalog
  return Object.freeze(candidates.filter((question) => allowed.has(question.questionKey) && (question.subjectCodes as readonly AIIntakeSubjectCode[]).includes(subject) && !unavailable.has(question.questionKey) && !containsKnownFact(input.originalInput, question.questionKey)).slice(0, Math.min(AI_CONTEXT_QUESTION_LIMIT, Math.max(0, input.remainingQuestionBudget))))
}
