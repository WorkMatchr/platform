import {
  classifyAIIntakeWithCache,
  readCachedAIClassification,
} from '@/lib/ai-intake-classifier/ai-classification-cache'
import type { PublicIntakeDraftView } from './public-intake-types'

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
    aiClassification: result.classification,
  }
}
