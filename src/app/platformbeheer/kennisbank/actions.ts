'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { emptyKnowledgeActionState, type KnowledgeActionState } from '@/lib/knowledge/knowledge-action-state'
import {
  addKnowledgeSupportingSource,
  decideKnowledgeReview,
  KnowledgeReviewError,
  knowledgeReviewDecisionSchema,
  knowledgeReviewDraftSchema,
  knowledgeSupportingSourceSchema,
  saveKnowledgeReviewDraft,
  withdrawKnowledgeReviewApproval,
  withdrawKnowledgeSupportingSource,
} from '@/lib/knowledge/knowledge-review-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export type KnowledgeReviewActionState = KnowledgeActionState

export const initialKnowledgeReviewActionState: KnowledgeReviewActionState = emptyKnowledgeActionState

function optionalDate(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.trim() ? value : null
}

function formValues(formData: FormData) {
  return {
    reviewTaskId: formData.get('reviewTaskId'),
    expectedVersion: formData.get('expectedVersion'),
    proposedStatement: formData.get('proposedStatement'),
    substantiveNotes: formData.get('substantiveNotes'),
    practicalNuance: formData.get('practicalNuance'),
    applicabilityConditions: formData.get('applicabilityConditions'),
    exceptions: formData.get('exceptions'),
    editorialNote: formData.get('editorialNote'),
    proposedAccessTier: formData.get('proposedAccessTier') || null,
    nextReviewAt: optionalDate(formData.get('nextReviewAt')),
  }
}

function validationError(error: z.ZodError): KnowledgeReviewActionState {
  return {
    status: 'error',
    message: 'Controleer de gemarkeerde controlevelden.',
    fieldErrors: error.flatten().fieldErrors,
  }
}

function serviceError(error: unknown): KnowledgeReviewActionState {
  if (error instanceof KnowledgeReviewError) return { status: 'error', message: error.message, fieldErrors: {} }
  throw error
}

function refreshReview(reviewTaskId: string) {
  revalidatePath('/platformbeheer/kennisbank')
  revalidatePath('/platformbeheer/kennisbank/beoordelingen')
  revalidatePath(`/platformbeheer/kennisbank/beoordelingen/${reviewTaskId}`)
}

export async function saveKnowledgeReviewDraftAction(
  _previous: KnowledgeReviewActionState,
  formData: FormData,
): Promise<KnowledgeReviewActionState> {
  const administrator = await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const parsed = knowledgeReviewDraftSchema.safeParse(formValues(formData))
  if (!parsed.success) return validationError(parsed.error)
  try {
    await saveKnowledgeReviewDraft(administrator.id, parsed.data)
    refreshReview(parsed.data.reviewTaskId)
    return { status: 'success', message: 'Uw controleconcept is opgeslagen. Er is niets gepubliceerd.', fieldErrors: {} }
  } catch (error) {
    return serviceError(error)
  }
}

export async function decideKnowledgeReviewAction(
  _previous: KnowledgeReviewActionState,
  formData: FormData,
): Promise<KnowledgeReviewActionState> {
  const administrator = await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const values = {
    ...formValues(formData),
    operation: formData.get('operation'),
    reason: formData.get('reason'),
    deferredUntil: optionalDate(formData.get('deferredUntil')),
    confirmed: formData.get('confirmed') === 'on',
  }
  const parsed = knowledgeReviewDecisionSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error)
  try {
    await decideKnowledgeReview(administrator.id, parsed.data)
    refreshReview(parsed.data.reviewTaskId)
    const message = parsed.data.operation === 'CONTENT_APPROVE'
      ? 'De broncontrole is afgerond. Het kennisitem is niet gepubliceerd en niet automatisch als actueel aangemerkt.'
      : parsed.data.operation === 'REJECT'
        ? 'Het kennisitem is afgewezen en blijft bewaard in de historie.'
        : parsed.data.operation === 'DEFER'
          ? 'De kenniscontrole is uitgesteld.'
          : 'Het kennisitem is gemarkeerd voor hercontrole.'
    return { status: 'success', message, fieldErrors: {} }
  } catch (error) {
    return serviceError(error)
  }
}

export async function addKnowledgeSupportingSourceAction(
  _previous: KnowledgeReviewActionState,
  formData: FormData,
): Promise<KnowledgeReviewActionState> {
  const administrator = await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const parsed = knowledgeSupportingSourceSchema.safeParse({
    reviewTaskId: formData.get('reviewTaskId'),
    expectedVersion: formData.get('expectedVersion'),
    sourceVersionId: formData.get('sourceVersionId') || null,
    sourceType: formData.get('sourceType'),
    title: formData.get('title'),
    publisher: formData.get('publisher'),
    urlOrReference: formData.get('urlOrReference'),
    publicationDate: optionalDate(formData.get('publicationDate')),
    checkedAt: optionalDate(formData.get('checkedAt')),
    authorityLevel: formData.get('authorityLevel'),
    isPrimary: formData.get('isPrimary') === 'on',
    sourceFamily: formData.get('sourceFamily'),
    supportType: formData.get('supportType'),
  })
  if (!parsed.success) return validationError(parsed.error)
  try {
    await addKnowledgeSupportingSource(administrator.id, parsed.data)
    refreshReview(parsed.data.reviewTaskId)
    return { status: 'success', message: 'De ondersteunende bron is geregistreerd. De bron is niet automatisch als betrouwbaar aangemerkt.', fieldErrors: {} }
  } catch (error) {
    return serviceError(error)
  }
}

const withdrawalSchema = z.object({
  reviewTaskId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(5).max(1500),
  confirmed: z.literal('on'),
})

export async function withdrawKnowledgeReviewApprovalAction(
  _previous: KnowledgeReviewActionState,
  formData: FormData,
): Promise<KnowledgeReviewActionState> {
  const administrator = await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const parsed = withdrawalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error)
  try {
    await withdrawKnowledgeReviewApproval(administrator.id, parsed.data)
    refreshReview(parsed.data.reviewTaskId)
    return { status: 'success', message: 'De eerdere broncontrole is ingetrokken. De historie blijft behouden.', fieldErrors: {} }
  } catch (error) {
    return serviceError(error)
  }
}

const sourceWithdrawalSchema = z.object({
  reviewTaskId: z.string().uuid(),
  referenceId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
})

export async function withdrawKnowledgeSupportingSourceAction(formData: FormData) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const parsed = sourceWithdrawalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  await withdrawKnowledgeSupportingSource(administrator.id, parsed.data)
  refreshReview(parsed.data.reviewTaskId)
}
