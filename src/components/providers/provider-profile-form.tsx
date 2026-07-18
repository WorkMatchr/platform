'use client'

import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'
import { ProviderFormFeedback } from './provider-form-feedback'
import { useProviderForm } from './use-provider-form'

export function ProviderProfileForm({ action, version, description, maxTravelDistanceKm, acceptsRemoteWork }: { action: (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>; version: number; description: string | null; maxTravelDistanceKm: number | null; acceptsRemoteWork: boolean }) {
  const form = useProviderForm(action)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-6" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={version} />
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor="description" className="font-semibold">Bedrijfsomschrijving <span className="font-normal text-text-secondary">(optioneel)</span></label><textarea id="description" name="description" rows={6} maxLength={2000} defaultValue={form.value('description', description ?? '')} className={fieldClassName} aria-describedby="description-help" /><p id="description-help" className="mt-2 text-sm text-text-secondary">Deze vrije toelichting wordt niet gebruikt voor toekomstige selectie.</p></div>
    <div><label htmlFor="maxTravelDistanceKm" className="font-semibold">Maximale reisafstand in kilometers <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="maxTravelDistanceKm" name="maxTravelDistanceKm" type="number" min="0" max="1000" defaultValue={form.value('maxTravelDistanceKm', maxTravelDistanceKm?.toString() ?? '')} className={fieldClassName} aria-invalid={form.invalid('maxTravelDistanceKm')} aria-describedby="maxTravelDistanceKm-error" /><FieldError id="maxTravelDistanceKm-error" message={form.error('maxTravelDistanceKm')} /></div>
    <label className="flex min-h-11 items-start gap-3 rounded-control border border-border p-4"><input name="acceptsRemoteWork" type="checkbox" className="mt-1" defaultChecked={typeof form.state.values?.acceptsRemoteWork === 'boolean' ? form.state.values.acceptsRemoteWork : acceptsRemoteWork} /><span>Onze organisatie kan diensten op afstand uitvoeren.</span></label>
    <Button type="submit" loading={form.pending}>Opslaan</Button>
  </form>
}
