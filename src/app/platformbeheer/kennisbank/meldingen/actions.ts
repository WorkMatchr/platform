'use server'

import { revalidatePath } from 'next/cache'
import { emptyKnowledgeActionState, type KnowledgeActionState } from '@/lib/knowledge/knowledge-action-state'
import { handleKnowledgeImprovementReport, knowledgeImprovementHandlingSchema } from '@/lib/knowledge/knowledge-improvement-service'
import { KnowledgeReviewError } from '@/lib/knowledge/knowledge-review-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const initialKnowledgeImprovementHandlingState = emptyKnowledgeActionState

export async function handleKnowledgeImprovementAction(
  _previous: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const administrator = await requirePlatformAdministrator('/platformbeheer/kennisbank/meldingen')
  const parsed = knowledgeImprovementHandlingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return {
    status: 'error',
    message: 'Controleer de gemarkeerde velden.',
    fieldErrors: parsed.error.flatten().fieldErrors,
  }
  try {
    await handleKnowledgeImprovementReport(administrator.id, parsed.data)
    revalidatePath('/platformbeheer/kennisbank')
    revalidatePath('/platformbeheer/kennisbank/meldingen')
    revalidatePath(`/platformbeheer/kennisbank/beoordelingen/${formData.get('reviewTaskId') ?? ''}`)
    return { status: 'success', message: 'De afhandeling is auditbaar vastgelegd.', fieldErrors: {} }
  } catch (error) {
    if (error instanceof KnowledgeReviewError) return { status: 'error', message: error.message, fieldErrors: {} }
    throw error
  }
}

