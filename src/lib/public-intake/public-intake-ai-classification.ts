import {
  classifyAIIntakeWithCache,
  readCachedAIClassification,
} from '@/lib/ai-intake-classifier/ai-classification-cache'
import type { AIClassifierOutput, AIIntakeSubjectCode } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'
import type { PublicIntakeDraftView } from './public-intake-types'
import { buildPublicIntakeGuidanceHandoff } from './public-intake-guidance-handoff'
import { ensurePublicIntakeAIContextQuestions } from './public-intake-context-question-service'

function withRefreshedGuidance(draft: PublicIntakeDraftView): PublicIntakeDraftView {
  if (!draft.id) return draft
  const { guidance: _guidance, ...snapshot } = draft
  void _guidance
  return { ...draft, guidance: buildPublicIntakeGuidanceHandoff(draft.id, snapshot) }
}

const contextCategorySubjects: Readonly<Record<string, AIIntakeSubjectCode>> = Object.freeze({
  RIE: 'RIE',
  INCIDENT: 'INCIDENT',
  HAZARDOUS_SUBSTANCES: 'HAZARDOUS_SUBSTANCES',
  OCCUPATIONAL_HEALTH: 'OCCUPATIONAL_HEALTH',
  BHV: 'EMERGENCY_RESPONSE',
})

function applyKnowledgeContextSupport(
  draft: PublicIntakeDraftView,
  classification: AIClassifierOutput | null,
): AIClassifierOutput | null {
  if (!classification || !draft.knowledgeContext || !draft.originalInput) return classification

  const context = resolveActiveKnowledgeContext(draft.knowledgeContext.id)
  if (!context || context.version !== draft.knowledgeContext.version || !context.suggestedCategory) return classification

  const suggestedSubject = contextCategorySubjects[context.suggestedCategory]
  const normalizedInput = draft.originalInput.toLocaleLowerCase('nl-NL')
  const hasExplicitContextSignal = context.classificationSignals.some((signal) =>
    normalizedInput.includes(signal.toLocaleLowerCase('nl-NL')),
  )
  if (!suggestedSubject || !hasExplicitContextSignal) return classification
  if (classification.primarySubject !== 'UNKNOWN' && classification.confidence !== 'LOW') return classification

  return Object.freeze({
    ...classification,
    primarySubject: suggestedSubject,
    confidence: 'MEDIUM',
    alternatives: classification.alternatives.filter((subject) => subject !== suggestedSubject),
  })
}

function selectedTopic(draft: PublicIntakeDraftView) {
  return draft.answers.find(
    (answer) =>
      answer.questionKey === 'guidance_topic' &&
      answer.disposition === 'ANSWERED',
  )
}

async function withPersistedContextQuestions(
  draft: PublicIntakeDraftView,
  classification: AIClassifierOutput | null,
): Promise<PublicIntakeDraftView> {
  if (!draft.id || !draft.originalInput || !classification) return draft
  const contextQuestions = await ensurePublicIntakeAIContextQuestions({
    draftId: draft.id,
    originalInput: draft.originalInput,
    classification,
    answeredQuestionKeys: draft.answers.map((answer) => answer.questionKey),
    fallbackQuestionWasAsked: draft.answers.some((answer) => answer.questionKey === 'guidance_topic'),
  })
  return { ...draft, contextQuestions }
}

export async function enrichPublicIntakeDraftWithAIClassification(
  draft: PublicIntakeDraftView,
): Promise<PublicIntakeDraftView> {
  if (draft.entryPoint !== 'FREE_TEXT' || !draft.originalInput) return draft

  const topic = selectedTopic(draft)
  if (topic) {
    if (topic.source !== 'AI_CONFIRMED') return draft

    const classification = await readCachedAIClassification(
      draft.originalInput,
    )
    if (
      !classification ||
      classification.primarySubject !== topic.value
    ) {
      return draft
    }

    return withRefreshedGuidance(await withPersistedContextQuestions({
      ...draft,
      aiClassification: classification,
    }, classification))
  }

  const result = await classifyAIIntakeWithCache(draft.originalInput!)

  const classification = applyKnowledgeContextSupport(draft, result.classification)
  return withRefreshedGuidance(await withPersistedContextQuestions({
    ...draft,
    aiClassification: classification,
  }, classification))
}
