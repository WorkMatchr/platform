'use client'

import { useId } from 'react'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'
import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { ProviderFormFeedback } from './provider-form-feedback'
import { useProviderForm } from './use-provider-form'

type Action = (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>
type Option = { id: string; label: string }

export function ProviderProfessionalForm({ action, profileVersion, professional }: { action: Action; profileVersion: number; professional?: { id: string; version: number; displayName?: string; functionalRole?: string; status?: string } }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-5" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={profileVersion} />
    {professional && <><input type="hidden" name="professionalId" value={professional.id} /><input type="hidden" name="expectedProfessionalVersion" value={professional.version} /></>}
    <input type="hidden" name="status" value={professional?.status ?? 'ACTIVE'} />
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor="displayName" className="font-semibold">Naam</label><input id="displayName" name="displayName" defaultValue={form.value('displayName', professional?.displayName)} className={fieldClassName} aria-invalid={form.invalid('displayName')} aria-describedby="displayName-error" /><FieldError id="displayName-error" message={form.error('displayName')} /></div>
    <div><label htmlFor="functionalRole" className="font-semibold">Functionele rol</label><input id="functionalRole" name="functionalRole" defaultValue={form.value('functionalRole', professional?.functionalRole)} className={fieldClassName} aria-invalid={form.invalid('functionalRole')} aria-describedby="functionalRole-error" /><FieldError id="functionalRole-error" message={form.error('functionalRole')} /></div>
    <Button type="submit" loading={form.pending}>Opslaan</Button>
  </form>
}

export function ProviderQualificationForm({ action, profileVersion, professionalId, qualifications, capabilities }: { action: Action; profileVersion: number; professionalId: string; qualifications: Option[]; capabilities: Option[] }) {
  const form = useProviderForm(action)
  const selectedCapabilities = new Set(form.values('capabilityIds'))
  const certified = form.value('isCertified', 'false')
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-5" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={profileVersion} /><input type="hidden" name="professionalId" value={professionalId} />
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor="qualificationTermId" className="font-semibold">Kwalificatie</label><select id="qualificationTermId" name="qualificationTermId" defaultValue={form.value('qualificationTermId')} className={fieldClassName} aria-invalid={form.invalid('qualificationTermId')} aria-describedby="qualificationTermId-error"><option value="">Kies een kwalificatie</option>{qualifications.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><FieldError id="qualificationTermId-error" message={form.error('qualificationTermId')} /></div>
    <div><label htmlFor="issuer" className="font-semibold">Naam</label><input id="issuer" name="issuer" defaultValue={form.value('issuer')} className={fieldClassName} aria-invalid={form.invalid('issuer')} aria-describedby="issuer-error" /><FieldError id="issuer-error" message={form.error('issuer')} /></div>
    <fieldset aria-describedby="isCertified-help isCertified-error"><legend className="font-semibold">Gecertificeerd</legend><p id="isCertified-help" className="mt-1 text-sm text-text-secondary">Dit is Uw eigen verklaring en geen verificatie door WorkMatchr.</p><div className="mt-2 flex flex-wrap gap-4"><label className="flex min-h-11 items-center gap-2"><input type="radio" name="isCertified" value="true" defaultChecked={certified === 'true'} /><span>Ja</span></label><label className="flex min-h-11 items-center gap-2"><input type="radio" name="isCertified" value="false" defaultChecked={certified !== 'true'} /><span>Nee</span></label></div><FieldError id="isCertified-error" message={form.error('isCertified')} /></fieldset>
    <fieldset><legend className="font-semibold">Diensten</legend><p className="mt-1 text-sm text-text-secondary">Selecteer alle actieve diensten waarvoor deze kwalificatie relevant is.</p>{capabilities.length > 0 ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{capabilities.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-control border border-border p-3"><input type="checkbox" name="capabilityIds" value={item.id} defaultChecked={selectedCapabilities.has(item.id)} /><span>{item.label}</span></label>)}</div> : <p className="mt-2 rounded-control border border-border bg-background p-3 text-sm text-text-secondary">Voeg eerst een actieve dienst toe.</p>}</fieldset>
    <Button type="submit" loading={form.pending}>Kwalificatie toevoegen</Button>
  </form>
}

export function ProviderInsuranceForm({ action, profileVersion, insuranceTypes, evidence }: { action: Action; profileVersion: number; insuranceTypes: Option[]; evidence: Option[] }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-5" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={profileVersion} /><ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor="insuranceTypeTermId" className="font-semibold">Soort verzekering</label><select id="insuranceTypeTermId" name="insuranceTypeTermId" defaultValue={form.value('insuranceTypeTermId')} className={fieldClassName} aria-invalid={form.invalid('insuranceTypeTermId')} aria-describedby="insuranceTypeTermId-error"><option value="">Kies een soort</option>{insuranceTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><FieldError id="insuranceTypeTermId-error" message={form.error('insuranceTypeTermId')} /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="insurer" className="font-semibold">Verzekeraar</label><input id="insurer" name="insurer" defaultValue={form.value('insurer')} className={fieldClassName} aria-invalid={form.invalid('insurer')} aria-describedby="insurer-error" /><FieldError id="insurer-error" message={form.error('insurer')} /></div><div><label htmlFor="policyReference" className="font-semibold">Polisreferentie</label><input id="policyReference" name="policyReference" defaultValue={form.value('policyReference')} className={fieldClassName} aria-invalid={form.invalid('policyReference')} aria-describedby="policyReference-error" /><FieldError id="policyReference-error" message={form.error('policyReference')} /></div></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="effectiveFrom" className="font-semibold">Ingangsdatum</label><input id="effectiveFrom" type="date" name="effectiveFrom" defaultValue={form.value('effectiveFrom')} className={fieldClassName} /></div><div><label htmlFor="expiresAt" className="font-semibold">Einddatum</label><input id="expiresAt" type="date" name="expiresAt" defaultValue={form.value('expiresAt')} className={fieldClassName} /></div></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="coverageAmountCents" className="font-semibold">Dekking in centen</label><input id="coverageAmountCents" inputMode="numeric" name="coverageAmountCents" defaultValue={form.value('coverageAmountCents')} className={fieldClassName} /></div><div><label htmlFor="coverageGeography" className="font-semibold">Dekkingsgebied</label><input id="coverageGeography" name="coverageGeography" defaultValue={form.value('coverageGeography')} className={fieldClassName} /></div></div>
    <div><label htmlFor="evidenceRevisionId" className="font-semibold">Gecontroleerd bewijsbestand</label><select id="evidenceRevisionId" name="evidenceRevisionId" defaultValue={form.value('evidenceRevisionId')} className={fieldClassName}><option value="">Kies een veilig verwerkt bewijsbestand</option>{evidence.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    <Button type="submit" loading={form.pending}>Verzekering toevoegen</Button>
  </form>
}

export function ProviderRecordStatusForm({ action, profileVersion, recordVersion, recordId, kind, status, returnPath }: { action: Action; profileVersion: number; recordVersion: number; recordId: string; kind: string; status: 'ACTIVE' | 'ARCHIVED'; returnPath: string }) {
  const form = useProviderForm(action)
  const next = status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'
  return <form action={form.formAction}><input type="hidden" name="expectedProfileVersion" value={profileVersion} /><input type="hidden" name="expectedRecordVersion" value={recordVersion} /><input type="hidden" name="recordId" value={recordId} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="status" value={next} /><input type="hidden" name="returnPath" value={returnPath} /><Button type="submit" variant="secondary" loading={form.pending}>{next === 'ARCHIVED' ? 'Archiveren' : 'Opnieuw activeren'}</Button></form>
}

export function ProviderTermAcceptanceForm({ action, profileVersion, documentVersionId }: { action: Action; profileVersion: number; documentVersionId: string }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-3"><input type="hidden" name="expectedProfileVersion" value={profileVersion} /><input type="hidden" name="documentVersionId" value={documentVersionId} /><label className="flex items-start gap-3"><input type="checkbox" name="confirmed" className="mt-1" aria-invalid={form.invalid('confirmed')} aria-describedby="term-confirmed-error" /><span>Ik bevestig dat ik namens de organisatie akkoord ga.</span></label><FieldError id="term-confirmed-error" message={form.error('confirmed')} /><ProviderFormFeedback state={form.state} dirty={form.dirty} /><Button type="submit" loading={form.pending}>Accepteren</Button></form>
}

export function ProviderSubmitForm({ action, profileVersion }: { action: Action; profileVersion: number }) {
  const form = useProviderForm(action)
  const idempotencyKey = `provider-submission-${useId()}`
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-4"><input type="hidden" name="expectedProfileVersion" value={profileVersion} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} /><label className="flex items-start gap-3"><input type="checkbox" name="confirmed" className="mt-1" aria-invalid={form.invalid('confirmed')} aria-describedby="submit-confirmed-error" /><span>Ik bevestig dat het dossier volledig en naar waarheid is ingevuld.</span></label><FieldError id="submit-confirmed-error" message={form.error('confirmed')} /><ProviderFormFeedback state={form.state} dirty={form.dirty} /><Button type="submit" loading={form.pending}>Dossier indienen</Button></form>
}

export function ProviderWithdrawForm({ action, submissionId, version }: { action: Action; submissionId: string; version: number }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-4"><input type="hidden" name="submissionId" value={submissionId} /><input type="hidden" name="expectedVersion" value={version} /><div><label htmlFor="withdraw-reason" className="font-semibold">Reden voor intrekken</label><textarea id="withdraw-reason" name="reason" defaultValue={form.value('reason')} className={fieldClassName} aria-invalid={form.invalid('reason')} aria-describedby="withdraw-reason-error" /><FieldError id="withdraw-reason-error" message={form.error('reason')} /></div><label className="flex gap-3"><input type="checkbox" name="confirmed" aria-invalid={form.invalid('confirmed')} aria-describedby="withdraw-confirmed-error" /><span>Ik bevestig dat ik deze indiening wil intrekken.</span></label><FieldError id="withdraw-confirmed-error" message={form.error('confirmed')} /><ProviderFormFeedback state={form.state} dirty={form.dirty} /><Button type="submit" variant="secondary" loading={form.pending}>Indiening intrekken</Button></form>
}

export function ProviderFindingResponseForm({ action, findingId, version }: { action: Action; findingId: string; version: number }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-3"><input type="hidden" name="findingId" value={findingId} /><input type="hidden" name="expectedResolutionVersion" value={version} /><label htmlFor={`response-${findingId}`} className="font-semibold">Uw antwoord</label><textarea id={`response-${findingId}`} name="response" defaultValue={form.value('response')} className={fieldClassName} aria-invalid={form.invalid('response')} aria-describedby={`response-${findingId}-error`} /><FieldError id={`response-${findingId}-error`} message={form.error('response')} /><ProviderFormFeedback state={form.state} dirty={form.dirty} /><Button type="submit" loading={form.pending}>Antwoord opslaan</Button></form>
}

export function ProviderResubmitForm({ action, submissionId, version }: { action: Action; submissionId: string; version: number }) {
  const form = useProviderForm(action)
  const idempotencyKey = `provider-resubmission-${useId()}`
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-4"><input type="hidden" name="submissionId" value={submissionId} /><input type="hidden" name="expectedVersion" value={version} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} /><label className="flex gap-3"><input type="checkbox" name="confirmed" aria-invalid={form.invalid('confirmed')} aria-describedby="resubmit-confirmed-error" /><span>Ik bevestig dat de gevraagde aanvullingen zijn verwerkt.</span></label><FieldError id="resubmit-confirmed-error" message={form.error('confirmed')} /><ProviderFormFeedback state={form.state} dirty={form.dirty} /><Button type="submit" loading={form.pending}>Opnieuw indienen</Button></form>
}
