'use client'

import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'
import { ProviderFormFeedback } from './provider-form-feedback'
import { useProviderForm } from './use-provider-form'

type Option = { id: string; label: string }
type Capability = { id: string; version: number; serviceTermId?: string; specialismTermId?: string; deliveryModes?: string[] }

export function ProviderCapabilityForm({ action, profileVersion, services, specialisms, capability }: { action: (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>; profileVersion: number; services: Option[]; specialisms: Option[]; capability?: Capability }) {
  const form = useProviderForm(action)
  const selectedModes = new Set(form.values('deliveryModes', capability?.deliveryModes ?? []))
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-5" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={profileVersion} />{capability && <><input type="hidden" name="capabilityId" value={capability.id} /><input type="hidden" name="expectedRecordVersion" value={capability.version} /></>}
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor={`service-${capability?.id ?? 'new'}`} className="font-semibold">Dienst</label><select id={`service-${capability?.id ?? 'new'}`} name="serviceTermId" defaultValue={form.value('serviceTermId', capability?.serviceTermId ?? '')} className={fieldClassName} aria-invalid={form.invalid('serviceTermId')} aria-describedby={`service-error-${capability?.id ?? 'new'}`}><option value="">Kies een dienst</option>{services.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><FieldError id={`service-error-${capability?.id ?? 'new'}`} message={form.error('serviceTermId')} /></div>
    <div><label htmlFor={`specialism-${capability?.id ?? 'new'}`} className="font-semibold">Specialisme <span className="font-normal text-text-secondary">(optioneel)</span></label><select id={`specialism-${capability?.id ?? 'new'}`} name="specialismTermId" defaultValue={form.value('specialismTermId', capability?.specialismTermId ?? '')} className={fieldClassName}><option value="">Geen specialisme</option>{specialisms.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
    <fieldset><legend className="font-semibold">Leveringsvormen</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{[['ON_SITE','Op locatie'],['HYBRID','Hybride'],['REMOTE','Remote']].map(([value,label]) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-control border border-border p-3"><input type="checkbox" name="deliveryModes" value={value} defaultChecked={selectedModes.has(value)} /><span>{label}</span></label>)}</div><FieldError id="deliveryModes-error" message={form.error('deliveryModes')} /></fieldset>
    <Button type="submit" loading={form.pending}>Opslaan</Button>
  </form>
}
