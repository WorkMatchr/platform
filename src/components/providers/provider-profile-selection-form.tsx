'use client'

import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'
import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { ProviderFormFeedback } from './provider-form-feedback'
import { useProviderForm } from './use-provider-form'

type Option = { id: string; label: string }

export function ProviderProfileSelectionForm({
  action,
  profileVersion,
  expertiseOptions,
  selectedExpertiseIds,
  workModeOptions,
  selectedWorkModeIds,
}: {
  action: (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>
  profileVersion: number
  expertiseOptions: Option[]
  selectedExpertiseIds: string[]
  workModeOptions: Option[]
  selectedWorkModeIds: string[]
}) {
  const form = useProviderForm(action)
  const selectedExpertise = new Set(form.values('coreExpertiseTermIds', selectedExpertiseIds))
  const selectedWorkModes = new Set(form.values('workModeTermIds', selectedWorkModeIds))

  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-7" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={profileVersion} />
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <fieldset>
      <legend className="font-semibold">Kernexpertises <span className="font-normal text-text-secondary">(maximaal drie)</span></legend>
      <p className="mt-1 text-sm text-text-secondary">U kunt alleen specialismen kiezen die al aan een actieve dienst zijn gekoppeld.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {expertiseOptions.length > 0 ? expertiseOptions.map((option) => <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-control border border-border p-3"><input type="checkbox" name="coreExpertiseTermIds" value={option.id} defaultChecked={selectedExpertise.has(option.id)} /><span>{option.label}</span></label>) : <p className="text-sm text-text-secondary">Voeg eerst een specialisme toe aan een dienst.</p>}
      </div>
      <FieldError id="coreExpertiseTermIds-error" message={form.error('coreExpertiseTermIds')} />
    </fieldset>
    <fieldset>
      <legend className="font-semibold">Werkvormen</legend>
      <p className="mt-1 text-sm text-text-secondary">Kies hoe u opdrachten inhoudelijk uitvoert. Beschikbaarheid en planning worden pas bij een concrete reactie besproken.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {workModeOptions.map((option) => <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-control border border-border p-3"><input type="checkbox" name="workModeTermIds" value={option.id} defaultChecked={selectedWorkModes.has(option.id)} /><span>{option.label}</span></label>)}
      </div>
    </fieldset>
    <Button type="submit" loading={form.pending}>Expertise en werkvormen opslaan</Button>
  </form>
}

export function ProviderOrganizationClaimForm({
  action,
  profileVersion,
  options,
  idPrefix,
  selectionLabel,
  numberLabel,
  submitLabel,
}: {
  action: (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>
  profileVersion: number
  options: Option[]
  idPrefix: string
  selectionLabel: string
  numberLabel: string
  submitLabel: string
}) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-5" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={profileVersion} />
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor={`${idPrefix}-term`} className="font-semibold">{selectionLabel}</label><select id={`${idPrefix}-term`} name="qualificationTermId" className={fieldClassName} defaultValue={form.value('qualificationTermId', '')} aria-invalid={form.invalid('qualificationTermId')}><option value="">Maak een keuze</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><FieldError id={`${idPrefix}-term-error`} message={form.error('qualificationTermId')} /></div>
    <div><label htmlFor={`${idPrefix}-number`} className="font-semibold">{numberLabel} <span className="font-normal text-text-secondary">(optioneel)</span></label><input id={`${idPrefix}-number`} name="registrationNumber" maxLength={200} className={fieldClassName} defaultValue={form.value('registrationNumber', '')} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor={`${idPrefix}-start`} className="font-semibold">Startdatum <span className="font-normal text-text-secondary">(optioneel)</span></label><input id={`${idPrefix}-start`} name="issuedAt" type="date" className={fieldClassName} defaultValue={form.value('issuedAt', '')} /></div><div><label htmlFor={`${idPrefix}-end`} className="font-semibold">Einddatum <span className="font-normal text-text-secondary">(optioneel)</span></label><input id={`${idPrefix}-end`} name="validUntil" type="date" className={fieldClassName} defaultValue={form.value('validUntil', '')} /></div></div>
    <p className="text-sm text-text-secondary">Nieuwe vermeldingen worden altijd opgeslagen als zelf opgegeven. U kent uzelf hiermee geen verificatiestatus toe.</p>
    <Button type="submit" loading={form.pending}>{submitLabel}</Button>
  </form>
}
