'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/authorization'
import {
  createProviderDossierFinding,
  finalizeProviderDossierReview,
  openProviderDossierReviewCase,
  requestAdditionalProviderInformation,
} from '@/lib/providers/provider-dossier-service'

const id = z.uuid()
const version = z.coerce.number().int().positive()
const reasonCode = z.string().trim().min(2).max(100).regex(/^[A-Z0-9_]+$/)

export async function openProviderReviewAction(formData: FormData) {
  const providerProfileId = id.parse(formData.get('providerProfileId'))
  const user = await requireUser(`/beheer/dossiers/${providerProfileId}`)
  await openProviderDossierReviewCase(user.id, providerProfileId, { submissionId: id.parse(formData.get('submissionId')), expectedVersion: version.parse(formData.get('expectedVersion')) })
  revalidatePath('/beheer/dossiers')
  revalidatePath('/aanbiedersdossier', 'layout')
  redirect(`/beheer/dossiers/${providerProfileId}`)
}

export async function createProviderFindingAction(formData: FormData) {
  const providerProfileId = id.parse(formData.get('providerProfileId'))
  const user = await requireUser(`/beheer/dossiers/${providerProfileId}`)
  await createProviderDossierFinding(user.id, providerProfileId, {
    reviewCaseId: id.parse(formData.get('reviewCaseId')),
    candidateId: id.parse(formData.get('candidateId')),
    section: z.enum(['ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA', 'PROFESSIONALS', 'QUALIFICATIONS', 'INSURANCE', 'EVIDENCE', 'DECLARATIONS']).parse(formData.get('section')),
    reasonCode: reasonCode.parse(formData.get('reasonCode')),
    providerMessage: z.string().trim().min(10).max(1000).parse(formData.get('providerMessage')),
    internalNote: z.string().trim().max(2000).optional().parse(formData.get('internalNote') || undefined),
  })
  revalidatePath(`/beheer/dossiers/${providerProfileId}`)
  revalidatePath('/aanbiedersdossier', 'layout')
}

export async function requestProviderInformationAction(formData: FormData) {
  const providerProfileId = id.parse(formData.get('providerProfileId'))
  const user = await requireUser(`/beheer/dossiers/${providerProfileId}`)
  await requestAdditionalProviderInformation(user.id, providerProfileId, {
    submissionId: id.parse(formData.get('submissionId')),
    reviewCaseId: id.parse(formData.get('reviewCaseId')),
    expectedVersion: version.parse(formData.get('expectedVersion')),
    reasonCode: reasonCode.parse(formData.get('reasonCode')),
  })
  revalidatePath('/beheer/dossiers')
  revalidatePath('/aanbiedersdossier', 'layout')
  redirect('/beheer/dossiers')
}

export async function finalizeProviderReviewAction(formData: FormData) {
  const providerProfileId = id.parse(formData.get('providerProfileId'))
  const user = await requireUser(`/beheer/dossiers/${providerProfileId}`)
  await finalizeProviderDossierReview(user.id, providerProfileId, z.enum(['APPROVED', 'REJECTED']).parse(formData.get('outcome')), {
    submissionId: id.parse(formData.get('submissionId')),
    reviewCaseId: id.parse(formData.get('reviewCaseId')),
    expectedVersion: version.parse(formData.get('expectedVersion')),
    reviewedByUserId: id.parse(formData.get('reviewedByUserId')),
    reasonCode: reasonCode.parse(formData.get('reasonCode')),
  })
  revalidatePath('/beheer/dossiers')
  revalidatePath('/aanbiedersdossier', 'layout')
  redirect('/beheer/dossiers')
}
