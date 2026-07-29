import { classifyAIIntakeWithCache } from '@/lib/ai-intake-classifier/ai-classification-cache'
import type { PublicIntakeDraftView } from './public-intake-types'

function needsAIClassification(draft: PublicIntakeDraftView): boolean {
  return (
    draft.entryPoint === 'FREE_TEXT' &&
    Boolean(draft.originalInput) &&
    !draft.answers.some(
      (answer) =>
        answer.questionKey === 'guidance_topic' &&
        answer.disposition === 'ANSWERED',
    )
  )
}

export async function enrichPublicIntakeDraftWithAIClassification(
  draft: PublicIntakeDraftView,
): Promise<PublicIntakeDraftView> {
  if (!needsAIClassification(draft)) return draft

  const result = await classifyAIIntakeWithCache(draft.originalInput!)

  return {
    ...draft,
    aiClassification: result.classification,
  }
}
