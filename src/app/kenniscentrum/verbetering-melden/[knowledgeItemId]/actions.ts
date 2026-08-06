'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/authorization'
import { KnowledgeReviewError } from '@/lib/knowledge/knowledge-review-service'
import { knowledgeImprovementReportSchema, reportKnowledgeImprovement } from '@/lib/knowledge/knowledge-improvement-service'
import { initialKnowledgeImprovementActionState } from '@/lib/knowledge/knowledge-improvement-action-state'
import type { KnowledgeImprovementActionState } from '@/lib/knowledge/knowledge-improvement-action-state'

export async function submitKnowledgeImprovementAction(
  _previous: KnowledgeImprovementActionState,
  formData: FormData,
): Promise<KnowledgeImprovementActionState> {
  const user = await requireUser('/kenniscentrum')
  const parsed = knowledgeImprovementReportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return {
    status: 'error',
    message: 'Controleer de gemarkeerde velden.',
    fieldErrors: parsed.error.flatten().fieldErrors,
  }
  try {
    await reportKnowledgeImprovement(user.id, parsed.data)
    revalidatePath('/platformbeheer/kennisbank')
    revalidatePath('/platformbeheer/kennisbank/meldingen')
    return {
      ...initialKnowledgeImprovementActionState,
      status: 'success',
      message: 'Dank u. Uw inhoudelijke melding is veilig ontvangen en wordt onderzocht.',
    }
  } catch (error) {
    if (error instanceof KnowledgeReviewError) return {
      ...initialKnowledgeImprovementActionState,
      status: 'error',
      message: error.message,
    }
    throw error
  }
}
