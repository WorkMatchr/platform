import {
  classifyAIIntakeWithCache,
  readCachedAIClassification,
} from '@/lib/ai-intake-classifier/ai-classification-cache'
import type { AIClassifierOutput, AIIntakeSubjectCode } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'
import type { PublicIntakeDraftView } from './public-intake-types'

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

    return {
      ...draft,
      aiClassification: classification,
    }
  }

  const result = await classifyAIIntakeWithCache(draft.originalInput!)

  return {
    ...draft,
    aiClassification: applyKnowledgeContextSupport(draft, result.classification),
  }
}
