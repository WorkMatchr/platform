'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createProviderCapability } from '@/lib/providers/provider-capability-service'
import { acceptProviderTerm, registerProviderInsurance } from '@/lib/providers/provider-compliance-service'
import {
  createProviderDossierSubmission,
  resolveProviderDossierFinding,
  resubmitProviderDossier,
  withdrawProviderDossierSubmission,
} from '@/lib/providers/provider-dossier-service'
import { ProviderServiceError } from '@/lib/providers/provider-errors'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { createProviderProfessional, addProviderProfessionalQualification, reviseProviderProfessionalIdentity } from '@/lib/providers/provider-professional-service'
import { createProviderSectorExperience, createProviderWorkArea } from '@/lib/providers/provider-profile-service'
import {
  reviseProviderCapability,
  reviseProviderInsurance,
  reviseProviderProfessionalQualification,
  reviseProviderSectorExperience,
  reviseProviderWorkArea,
  setProviderRecordStatus,
  updateProviderProfileFacts,
} from '@/lib/providers/provider-record-mutation-service'

export type ProviderActionValue = string | string[] | boolean
export type ProviderActionState = {
  message?: string
  success?: boolean
  savedAt?: string
  errors?: Record<string, string[] | undefined>
  values?: Record<string, ProviderActionValue>
}

const uuid = z.uuid({ error: 'Selecteer een geldige waarde.' })
const positiveVersion = z.coerce.number().int().positive()
const optionalUuid = z.preprocess((value) => value === '' ? undefined : value, uuid.optional())
const optionalNumber = z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().int().nonnegative().optional())

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || undefined
}

function stringList(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean)
}

function validationState(result: { error: z.ZodError }, values: Record<string, ProviderActionValue>): ProviderActionState {
  return { message: 'Controleer de gemarkeerde velden.', errors: result.error.flatten().fieldErrors, values }
}

function safeProviderState(error: unknown, values?: Record<string, ProviderActionValue>): ProviderActionState {
  if (error instanceof ProviderServiceError) {
    if (error.code === 'CONFLICT') {
      return { message: 'Deze gegevens zijn intussen gewijzigd. Vernieuw de pagina en controleer de actuele inhoud.', values }
    }
    return { message: error.message, values }
  }
  return { message: 'De wijziging kon niet veilig worden opgeslagen.', values }
}

function success(message = 'Uw wijzigingen zijn opgeslagen.'): ProviderActionState {
  return { message, success: true, savedAt: new Date().toISOString() }
}

function revalidateDossier(path?: string) {
  revalidatePath('/aanbiedersdossier')
  if (path) revalidatePath(path)
}

async function actionContext(returnTo: string) {
  const context = await requireProviderDossierContext(returnTo)
  return { userId: context.user.id, providerProfileId: context.providerProfileId, organizationId: context.organization.id }
}

const profileSchema = z.object({
  expectedProfileVersion: positiveVersion,
  description: z.string().max(2000).optional(),
  maxTravelDistanceKm: optionalNumber,
  acceptsRemoteWork: z.boolean(),
})

export async function saveProviderProfileAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = {
    expectedProfileVersion: text(formData, 'expectedProfileVersion'),
    description: text(formData, 'description'),
    maxTravelDistanceKm: text(formData, 'maxTravelDistanceKm'),
    acceptsRemoteWork: formData.get('acceptsRemoteWork') === 'on',
  }
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/bedrijfsgegevens')
  try {
    await updateProviderProfileFacts(context.userId, context.providerProfileId, parsed.data)
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/bedrijfsgegevens')
  return success()
}

const capabilitySchema = z.object({
  expectedProfileVersion: positiveVersion,
  capabilityId: optionalUuid,
  expectedRecordVersion: z.preprocess((value) => value === '' ? undefined : value, positiveVersion.optional()),
  serviceTermId: optionalUuid,
  specialismTermId: optionalUuid,
  deliveryModes: z.array(z.enum(['ON_SITE', 'HYBRID', 'REMOTE'])).min(1, 'Kies minimaal één leveringsvorm.'),
}).refine((value) => value.serviceTermId || value.specialismTermId, { path: ['serviceTermId'], message: 'Kies een dienst of specialisme.' })

export async function saveProviderCapabilityAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = {
    expectedProfileVersion: text(formData, 'expectedProfileVersion'), capabilityId: text(formData, 'capabilityId'),
    expectedRecordVersion: text(formData, 'expectedRecordVersion'), serviceTermId: text(formData, 'serviceTermId'),
    specialismTermId: text(formData, 'specialismTermId'),
    deliveryModes: stringList(formData, 'deliveryModes'),
  }
  const parsed = capabilitySchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/diensten')
  try {
    if (parsed.data.capabilityId && parsed.data.expectedRecordVersion) {
      await reviseProviderCapability(context.userId, context.providerProfileId, parsed.data)
    } else {
      await createProviderCapability(context.userId, context.providerProfileId, parsed.data)
    }
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/diensten')
  return success('De dienst is opgeslagen als zelfverklaarde informatie.')
}

const sectorSchema = z.object({
  expectedProfileVersion: positiveVersion, sectorExperienceId: optionalUuid,
  expectedRecordVersion: z.preprocess((value) => value === '' ? undefined : value, positiveVersion.optional()),
  sectorTermId: uuid, experienceYears: optionalNumber,
})

export async function saveProviderSectorAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), sectorExperienceId: text(formData, 'sectorExperienceId'), expectedRecordVersion: text(formData, 'expectedRecordVersion'), sectorTermId: text(formData, 'sectorTermId'), experienceYears: text(formData, 'experienceYears') }
  const parsed = sectorSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/sectorervaring')
  try {
    if (parsed.data.sectorExperienceId && parsed.data.expectedRecordVersion) await reviseProviderSectorExperience(context.userId, context.providerProfileId, parsed.data)
    else await createProviderSectorExperience(context.userId, context.providerProfileId, parsed.data)
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/sectorervaring')
  return success('De sectorervaring is opgeslagen als zelfverklaarde informatie.')
}

const workAreaSchema = z.object({
  expectedProfileVersion: positiveVersion, workAreaId: optionalUuid,
  expectedRecordVersion: z.preprocess((value) => value === '' ? undefined : value, positiveVersion.optional()),
  regionTermId: uuid, maxTravelDistanceKm: optionalNumber,
})

export async function saveProviderWorkAreaAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), workAreaId: text(formData, 'workAreaId'), expectedRecordVersion: text(formData, 'expectedRecordVersion'), regionTermId: text(formData, 'regionTermId'), maxTravelDistanceKm: text(formData, 'maxTravelDistanceKm') }
  const parsed = workAreaSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/werkgebied')
  try {
    if (parsed.data.workAreaId && parsed.data.expectedRecordVersion) await reviseProviderWorkArea(context.userId, context.providerProfileId, parsed.data)
    else await createProviderWorkArea(context.userId, context.providerProfileId, parsed.data)
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/werkgebied')
  return success('Het werkgebied is opgeslagen.')
}

const professionalSchema = z.object({
  expectedProfileVersion: positiveVersion, professionalId: optionalUuid,
  expectedProfessionalVersion: z.preprocess((value) => value === '' ? undefined : value, positiveVersion.optional()),
  displayName: z.string().min(2).max(160), functionalRole: z.string().min(2).max(160), status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
})

export async function saveProviderProfessionalAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), professionalId: text(formData, 'professionalId'), expectedProfessionalVersion: text(formData, 'expectedProfessionalVersion'), displayName: text(formData, 'displayName'), functionalRole: text(formData, 'functionalRole'), status: text(formData, 'status') || 'ACTIVE' }
  const parsed = professionalSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/professionals')
  let createdId: string | undefined
  try {
    if (parsed.data.professionalId && parsed.data.expectedProfessionalVersion) await reviseProviderProfessionalIdentity(context.userId, context.providerProfileId, parsed.data)
    else {
      const created = await createProviderProfessional(context.userId, context.providerProfileId, parsed.data)
      createdId = created.id
    }
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/professionals')
  if (createdId) redirect(`/aanbiedersdossier/professionals/${createdId}?aangemaakt=1`)
  return success('De professionalgegevens zijn opgeslagen.')
}

const qualificationSchema = z.object({
  expectedProfileVersion: positiveVersion, professionalId: uuid, qualificationId: optionalUuid,
  expectedRecordVersion: z.preprocess((value) => value === '' ? undefined : value, positiveVersion.optional()),
  qualificationTermId: uuid, issuer: z.string().min(2).max(200), isCertified: z.enum(['true', 'false']).transform((value) => value === 'true'), registrationNumber: z.string().max(200).optional(),
  issuedAt: z.preprocess((value) => value === '' ? undefined : value, z.coerce.date().optional()),
  validUntil: z.preprocess((value) => value === '' ? undefined : value, z.coerce.date().optional()),
  evidenceRevisionId: optionalUuid, capabilityIds: z.array(uuid).max(50),
})

export async function saveProviderQualificationAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), professionalId: text(formData, 'professionalId'), qualificationId: text(formData, 'qualificationId'), expectedRecordVersion: text(formData, 'expectedRecordVersion'), qualificationTermId: text(formData, 'qualificationTermId'), issuer: text(formData, 'issuer'), isCertified: text(formData, 'isCertified'), registrationNumber: text(formData, 'registrationNumber'), issuedAt: text(formData, 'issuedAt'), validUntil: text(formData, 'validUntil'), evidenceRevisionId: text(formData, 'evidenceRevisionId'), capabilityIds: stringList(formData, 'capabilityIds') }
  const parsed = qualificationSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext(`/aanbiedersdossier/professionals/${values.professionalId}/kwalificaties`)
  const data = { ...parsed.data, registrationNumber: optionalText(formData, 'registrationNumber') }
  try {
    if (parsed.data.qualificationId && parsed.data.expectedRecordVersion) await reviseProviderProfessionalQualification(context.userId, context.providerProfileId, data)
    else await addProviderProfessionalQualification(context.userId, context.providerProfileId, data)
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier(`/aanbiedersdossier/professionals/${parsed.data.professionalId}/kwalificaties`)
  return success('De kwalificatie is opgeslagen als zelfverklaarde informatie.')
}

const insuranceSchema = z.object({
  expectedProfileVersion: positiveVersion, insuranceId: optionalUuid,
  expectedRecordVersion: z.preprocess((value) => value === '' ? undefined : value, positiveVersion.optional()),
  insuranceTypeTermId: uuid, insurer: z.string().min(2).max(200), policyReference: z.string().min(2).max(200),
  effectiveFrom: z.coerce.date(), expiresAt: z.coerce.date(), evidenceRevisionId: uuid,
  coverageAmountCents: z.preprocess((value) => value === '' ? undefined : value, z.coerce.bigint().nonnegative().optional()),
  coverageGeography: z.string().max(100).optional(),
})

export async function saveProviderInsuranceAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), insuranceId: text(formData, 'insuranceId'), expectedRecordVersion: text(formData, 'expectedRecordVersion'), insuranceTypeTermId: text(formData, 'insuranceTypeTermId'), insurer: text(formData, 'insurer'), policyReference: text(formData, 'policyReference'), effectiveFrom: text(formData, 'effectiveFrom'), expiresAt: text(formData, 'expiresAt'), evidenceRevisionId: text(formData, 'evidenceRevisionId'), coverageAmountCents: text(formData, 'coverageAmountCents'), coverageGeography: text(formData, 'coverageGeography') }
  const parsed = insuranceSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/verzekeringen')
  const data = { ...parsed.data, insuredOrganizationId: context.organizationId, coverageGeography: optionalText(formData, 'coverageGeography') }
  try {
    if (parsed.data.insuranceId && parsed.data.expectedRecordVersion) await reviseProviderInsurance(context.userId, context.providerProfileId, data)
    else await registerProviderInsurance(context.userId, context.providerProfileId, data)
  } catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/verzekeringen')
  return success('De verzekeringsgegevens zijn opgeslagen als zelfverklaarde informatie.')
}

const statusSchema = z.object({ expectedProfileVersion: positiveVersion, expectedRecordVersion: positiveVersion, recordId: uuid, kind: z.enum(['CAPABILITY', 'SECTOR_EXPERIENCE', 'WORK_AREA', 'PROFESSIONAL', 'PROFESSIONAL_QUALIFICATION', 'ORGANIZATION_QUALIFICATION', 'INSURANCE', 'EVIDENCE']), status: z.enum(['ACTIVE', 'ARCHIVED']), returnPath: z.string().startsWith('/aanbiedersdossier').max(200) })

export async function setProviderRecordStatusAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), expectedRecordVersion: text(formData, 'expectedRecordVersion'), recordId: text(formData, 'recordId'), kind: text(formData, 'kind'), status: text(formData, 'status'), returnPath: text(formData, 'returnPath') }
  const parsed = statusSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext(parsed.data.returnPath)
  try { await setProviderRecordStatus(context.userId, context.providerProfileId, parsed.data.kind, parsed.data) }
  catch (error) { return safeProviderState(error, values) }
  revalidateDossier(parsed.data.returnPath)
  return success(parsed.data.status === 'ARCHIVED' ? 'Het onderdeel is gearchiveerd.' : 'Het onderdeel is opnieuw geactiveerd.')
}

const termSchema = z.object({ expectedProfileVersion: positiveVersion, documentVersionId: uuid, confirmed: z.literal('on', { error: 'Bevestig dat U namens de organisatie akkoord gaat.' }) })

export async function acceptProviderTermAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), documentVersionId: text(formData, 'documentVersionId'), confirmed: text(formData, 'confirmed') }
  const parsed = termSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/verklaringen')
  try { await acceptProviderTerm(context.userId, context.providerProfileId, parsed.data) }
  catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/verklaringen')
  return success('De actuele verklaring is namens de organisatie geaccepteerd.')
}

const submitSchema = z.object({ expectedProfileVersion: positiveVersion, idempotencyKey: z.string().min(16).max(160), confirmed: z.literal('on', { error: 'Bevestig de indiening.' }) })
export async function submitProviderDossierAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { expectedProfileVersion: text(formData, 'expectedProfileVersion'), idempotencyKey: text(formData, 'idempotencyKey'), confirmed: text(formData, 'confirmed') }
  const parsed = submitSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/controleren')
  try { await createProviderDossierSubmission(context.userId, context.providerProfileId, parsed.data) }
  catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/controleren')
  redirect('/aanbiedersdossier/controleren?ingediend=1')
}

const withdrawSchema = z.object({ submissionId: uuid, expectedVersion: positiveVersion, reason: z.string().min(10).max(500), confirmed: z.literal('on', { error: 'Bevestig het intrekken.' }) })
export async function withdrawProviderDossierAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { submissionId: text(formData, 'submissionId'), expectedVersion: text(formData, 'expectedVersion'), reason: text(formData, 'reason'), confirmed: text(formData, 'confirmed') }
  const parsed = withdrawSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/controleren')
  try { await withdrawProviderDossierSubmission(context.userId, context.providerProfileId, parsed.data) }
  catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/controleren')
  redirect('/aanbiedersdossier/controleren?ingetrokken=1')
}

const resolutionSchema = z.object({ findingId: uuid, expectedResolutionVersion: z.coerce.number().int().nonnegative(), response: z.string().min(10).max(1000) })
export async function resolveProviderFindingAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { findingId: text(formData, 'findingId'), expectedResolutionVersion: text(formData, 'expectedResolutionVersion'), response: text(formData, 'response') }
  const parsed = resolutionSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/controleren')
  try { await resolveProviderDossierFinding(context.userId, context.providerProfileId, parsed.data) }
  catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/controleren')
  return success('Uw antwoord is als nieuwe immutable revisie vastgelegd.')
}

const resubmitSchema = z.object({ submissionId: uuid, expectedVersion: positiveVersion, idempotencyKey: z.string().min(16).max(160), confirmed: z.literal('on', { error: 'Bevestig de herindiening.' }) })
export async function resubmitProviderDossierAction(_state: ProviderActionState, formData: FormData): Promise<ProviderActionState> {
  const values = { submissionId: text(formData, 'submissionId'), expectedVersion: text(formData, 'expectedVersion'), idempotencyKey: text(formData, 'idempotencyKey'), confirmed: text(formData, 'confirmed') }
  const parsed = resubmitSchema.safeParse(values)
  if (!parsed.success) return validationState(parsed, values)
  const context = await actionContext('/aanbiedersdossier/controleren')
  try { await resubmitProviderDossier(context.userId, context.providerProfileId, parsed.data) }
  catch (error) { return safeProviderState(error, values) }
  revalidateDossier('/aanbiedersdossier/controleren')
  redirect('/aanbiedersdossier/controleren?heringediend=1')
}
