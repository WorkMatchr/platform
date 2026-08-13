import type { AIClassifierOutput } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import type { PublicIntakeAnswerType } from '@/generated/prisma/client'
import {
  AI_CONTEXT_QUESTION_CATALOG_VERSION,
} from '@/lib/ai-intake-classifier/ai-context-question-catalog'
import {
  AI_CONTEXT_QUESTION_LIMIT,
  selectSafeAIContextQuestions,
} from '@/lib/ai-intake-classifier/ai-context-question-planner'
import { getPrisma } from '@/lib/prisma'
import type { PublicIntakeContextQuestionView } from './public-intake-types'

export const PUBLIC_INTAKE_CONTEXT_QUESTION_TOTAL_LIMIT = 5 as const

function toView(question: {
  questionKey: string
  catalogVersion: string
  textSnapshot: string
  answerType: PublicIntakeAnswerType
  category: string
  sequence: number
  source: string
  createdAt: Date
}): PublicIntakeContextQuestionView {
  if (question.source !== 'AI_CONTEXT_PLANNER') {
    throw new Error('PUBLIC_INTAKE_CONTEXT_QUESTION_SOURCE_INVARIANT')
  }
  return { ...question, source: 'AI_CONTEXT_PLANNER' }
}

/**
 * Persists only catalog-backed question snapshots. It never stores prompts or
 * model output, and is safe to repeat after a concurrent request or refresh.
 */
export async function ensurePublicIntakeAIContextQuestions(input: {
  draftId: string
  originalInput: string
  classification: AIClassifierOutput | null
  answeredQuestionKeys: readonly string[]
  fallbackQuestionWasAsked: boolean
}): Promise<readonly PublicIntakeContextQuestionView[]> {
  if (!input.classification || input.classification.confidence === 'LOW') return []

  return getPrisma().$transaction(async (transaction) => {
    const existing = await transaction.publicIntakeContextQuestion.findMany({
      where: { draftId: input.draftId },
      orderBy: { sequence: 'asc' },
      select: {
        questionKey: true,
        catalogVersion: true,
        textSnapshot: true,
        answerType: true,
        category: true,
        sequence: true,
        source: true,
        createdAt: true,
      },
    })
    const usedBudget = existing.length + (input.fallbackQuestionWasAsked ? 1 : 0)
    const remaining = PUBLIC_INTAKE_CONTEXT_QUESTION_TOTAL_LIMIT - usedBudget
    if (remaining <= 0) return existing.map(toView)

    const selected = selectSafeAIContextQuestions({
      originalInput: input.originalInput,
      classification: input.classification,
      answeredQuestionKeys: input.answeredQuestionKeys,
      askedQuestionKeys: existing.map((question) => question.questionKey),
      remainingQuestionBudget: remaining,
    }).slice(0, Math.min(AI_CONTEXT_QUESTION_LIMIT, remaining))

    if (selected.length === 0) return existing.map(toView)

    await transaction.publicIntakeContextQuestion.createMany({
      data: selected.map((question, index) => ({
        draftId: input.draftId,
        questionKey: question.questionKey,
        catalogVersion: AI_CONTEXT_QUESTION_CATALOG_VERSION,
        textSnapshot: question.text,
        answerType: question.answerType,
        category: question.category,
        sequence: existing.length + index + 1,
        source: 'AI_CONTEXT_PLANNER',
      })),
      skipDuplicates: true,
    })

    const stored = await transaction.publicIntakeContextQuestion.findMany({
      where: { draftId: input.draftId },
      orderBy: { sequence: 'asc' },
      select: {
        questionKey: true,
        catalogVersion: true,
        textSnapshot: true,
        answerType: true,
        category: true,
        sequence: true,
        source: true,
        createdAt: true,
      },
    })
    return stored.map(toView)
  }, { isolationLevel: 'Serializable' })
}
