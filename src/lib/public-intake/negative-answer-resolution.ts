import type { ExtractedFact } from './context-question-engine-types'
import type { PublicIntakeAnswerView } from './public-intake-types'

// Linguistic information types, not scenario-, domain- or provider-specific rules.
const topics = [
  { code: 'EXISTING_MEASUREMENTS', noun: 'metingen' },
  { code: 'EXISTING_ASSESSMENT', noun: 'onderzoek|beoordeling|beoordelingen' },
  { code: 'EXISTING_MEASURES', noun: 'maatregelen' },
  { code: 'PREVIOUS_INCIDENTS', noun: '(?:eerdere )?incidenten' },
] as const
const noun = `(?:${topics.map((topic) => topic.noun).join('|')})`
const nouns = `${noun}(?:\\s+(?:of|en)\\s+${noun})*`
const absent = new RegExp(`^(?:(?:er (?:zijn|is)|we hebben|wij hebben|wij namen|we namen)\\s+)?(?:nog\\s+)?geen\\s+(${nouns})(?:\\s+(?:uitgevoerd|gedaan|genomen|geweest|plaatsgevonden|aanwezig))?$`, 'i')
const notDone = new RegExp(`^(?:(?:de|het)\\s+)?(${nouns})(?:\\s+(?:is|zijn))?\\s+(?:nog\\s+)?niet\\s+(?:uitgevoerd|gedaan|genomen|aanwezig)$`, 'i')

export function isKnownAnswerValue(value: ExtractedFact['value'] | null): boolean {
  if (value === null) return false
  if (Array.isArray(value)) return value.length > 0 && value.every((part) => isKnownAnswerValue(part))
  if (typeof value !== 'string') return true // false and zero are known answers.
  const text = value.trim()
  return text.length > 0 && !/^(?:unknown|onbekend|not_sure|weet niet|dat weet ik niet|niet bekend|geen idee)$/i.test(text)
    && !/\b(?:weet|weten)\s+(?:we\s+|wij\s+|ik\s+)?niet\b|\b(?:onbekend|onduidelijk|misschien|mogelijk|vermoedelijk)\b/i.test(text)
}

export function isKnownAnswerFact(fact: ExtractedFact): boolean {
  return ['EXPLICIT_INPUT', 'RELIABLE_EXTRACTION', 'USER_CONFIRMED'].includes(fact.status)
    && fact.confidence >= 0.8 && isKnownAnswerValue(fact.value)
}

/** Only complete, unqualified declarations of absence may resolve another goal.
 * Scoped, hypothetical, quoted and conflicting statements fail closed.
 * These false-valued facts NEVER prove presence in applicability/presuppositions.
 */
export function extractNegativeAnswerFacts(answers: readonly PublicIntakeAnswerView[]): readonly ExtractedFact[] {
  const statements = answers.filter((answer) => answer.disposition === 'ANSWERED' && typeof answer.value === 'string')
    .flatMap((answer) => String(answer.value).split(/[.!;\n]+/).map((text) => ({ text: text.trim(), answer })))
    .filter(({ text }) => text.length > 0)
  const matched = statements.map((statement) => ({ ...statement,
    nouns: (statement.text.match(absent) ?? statement.text.match(notDone))?.[1] ?? null,
  }))
  return topics.flatMap((topic) => {
    const mentions = new RegExp(`\\b(?:${topic.noun})\\b`, 'i')
    const declaration = matched.find((item) => item.nouns && mentions.test(item.nouns))
    if (!declaration) return []
    // Do not discard qualifications or contradictory positive/uncertain statements.
    if (matched.some((item) => mentions.test(item.text) && (!item.nouns || !mentions.test(item.nouns)))) return []
    return [Object.freeze({ code: topic.code, value: false, status: 'USER_CONFIRMED' as const,
      confidence: 1, sourceQuestionKey: declaration.answer.questionKey,
      evidence: Object.freeze([declaration.text]), resolution: 'CASE_WIDE_ABSENCE' as const })]
  })
}
