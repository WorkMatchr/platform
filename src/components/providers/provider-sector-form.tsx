'use client'

import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'
import { ProviderFormFeedback } from './provider-form-feedback'
import { useProviderForm } from './use-provider-form'

export function ProviderSectorForm({ action, profileVersion, sectors, record }: { action: (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>; profileVersion: number; sectors: Array<{ id: string; label: string }>; record?: { id: string; version: number; sectorTermId: string; experienceYears: number | null } }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="grid gap-5 sm:grid-cols-2" noValidate><input type="hidden" name="expectedProfileVersion" value={profileVersion} />{record && <><input type="hidden" name="sectorExperienceId" value={record.id} /><input type="hidden" name="expectedRecordVersion" value={record.version} /></>}<div className="sm:col-span-2"><ProviderFormFeedback state={form.state} dirty={form.dirty} /></div><div><label htmlFor={`sector-${record?.id ?? 'new'}`} className="font-semibold">Sector</label><select id={`sector-${record?.id ?? 'new'}`} name="sectorTermId" defaultValue={form.value('sectorTermId', record?.sectorTermId ?? '')} className={fieldClassName} aria-invalid={form.invalid('sectorTermId')} aria-describedby="sectorTermId-error"><option value="">Kies een sector</option>{sectors.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><FieldError id="sectorTermId-error" message={form.error('sectorTermId')} /></div><div><label htmlFor={`years-${record?.id ?? 'new'}`} className="font-semibold">Ervaringsjaren <span className="font-normal text-text-secondary">(optioneel)</span></label><input id={`years-${record?.id ?? 'new'}`} name="experienceYears" type="number" min="0" max="80" defaultValue={form.value('experienceYears', record?.experienceYears?.toString() ?? '')} className={fieldClassName} /></div><div className="sm:col-span-2"><Button type="submit" loading={form.pending}>Opslaan</Button></div></form>
}
