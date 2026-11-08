'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { recordProviderVerificationReview } from '@/lib/providers/provider-verification-service'
import { z } from 'zod'
import { recordProviderQualificationDecision, refreshApprovedProviderSelection } from '@/lib/providers/provider-qualification-service'
import { ProviderServiceError } from '@/lib/providers/provider-errors'
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

export async function manageQualificationAction(form: FormData) {
  const profileId = id.parse(form.get('providerProfileId'))
  const path = `/beheer/dossiers/${profileId}`
  const user = await requireUser(path)
  let result: string
  try {
    const candidateId = id.parse(form.get('candidateId'))
    const expectedVersion = version.parse(form.get('expectedVersion'))
    if (form.get('operation') === 'selection') {
      const status = await refreshApprovedProviderSelection(user.id, profileId, candidateId, expectedVersion)
      result = status === 'SELECTABLE' ? 'selecteerbaar' : 'niet-selecteerbaar'
    } else {
      const target = form.get('target')
      const expiry = z.iso.date().parse(form.get('validThrough'))
      const until = new Date(expiry + 'T00:00:00.000Z')
      until.setUTCDate(until.getUTCDate() + 1)
      await recordProviderQualificationDecision(user.id, profileId, {
        dossierCandidateId: candidateId, expectedProfileVersion: expectedVersion, scope: target === 'PLATFORM' ? 'PLATFORM' : 'CAPABILITY',
        capabilityId: target === 'PLATFORM' ? undefined : id.parse(target), reviewedByUserId: id.parse(form.get('reviewerId')),
        reasonCode: reasonCode.parse(form.get('reasonCode')), outcome: z.enum(['QUALIFIED', 'RESTORED']).parse(form.get('outcome')), validUntil: until,
      })
      result = 'besluit'
    }
  } catch (error) {
    if (!(error instanceof ProviderServiceError || error instanceof z.ZodError)) throw error
    result = error instanceof ProviderServiceError ? error.code : 'VALIDATION_ERROR'
  }
  revalidatePath(path)
  revalidatePath('/beheer/dossiers')
  revalidatePath('/dashboard')
  redirect(`${path}?kwalificatie=${result}#kwalificatiebeheer`)
}

export async function recordVerificationAction(form: FormData) {
  const profileId = id.parse(form.get('providerProfileId'))
  const path = `/beheer/dossiers/${profileId}`
  const user = await requireUser(path)
  let feedback = 'opgeslagen'
  try {
    const outcome = z.enum(['VERIFIED', 'DOCUMENT_CHECKED', 'REJECTED', 'CHANGES_REQUESTED']).parse(form.get('outcome'))
    const positive = outcome === 'VERIFIED' || outcome === 'DOCUMENT_CHECKED'
    await recordProviderVerificationReview(user.id, profileId, {
      expectedProfileVersion: version.parse(form.get('expectedVersion')),
      dossier: { candidateId: form.get('candidateId'), reviewCaseId: form.get('reviewCaseId'), justification: form.get('justification') },
      subject: { type: form.get('type'), revisionId: form.get('revisionId') }, outcome,
      resultingLevel: positive ? outcome : 'SELF_DECLARED',
      reasonCode: positive ? 'QUALIFICATION_EVIDENCE_CONFIRMED' : 'CONFIGURATION_INCOMPLETE',
      validUntil: new Date(z.iso.date().parse(form.get('until')) + 'T00:00:00Z'),
    })
  } catch (error) {
    if (error instanceof ProviderServiceError) feedback = error.code
    else if (error instanceof z.ZodError) feedback = 'VALIDATION_ERROR'
    else if (error instanceof Error && 'code' in error && error.code === 'P2034') feedback = 'CONFLICT'
    else throw error
  }
  revalidatePath(path)
  redirect(`${path}?verificatie=${feedback}#verificaties`)
}
