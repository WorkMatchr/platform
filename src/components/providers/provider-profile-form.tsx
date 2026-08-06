'use client'

import { useState } from 'react'

import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'
import { ProviderFormFeedback } from './provider-form-feedback'
import { useProviderForm } from './use-provider-form'

export function ProviderProfileForm({ action, version, shortIntroduction, description, workingMethod }: { action: (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>; version: number; shortIntroduction: string | null; description: string | null; workingMethod: string | null }) {
  const form = useProviderForm(action)
  const initialIntroduction = form.value('shortIntroduction', shortIntroduction ?? '')
  const [introductionLength, setIntroductionLength] = useState(initialIntroduction.length)
  return <form data-provider-form={form.formId} action={form.formAction} onChange={() => form.setDirty(true)} className="space-y-6" noValidate>
    <input type="hidden" name="expectedProfileVersion" value={version} />
    <ProviderFormFeedback state={form.state} dirty={form.dirty} />
    <div><label htmlFor="shortIntroduction" className="font-semibold">Korte introductie</label><textarea id="shortIntroduction" name="shortIntroduction" rows={3} maxLength={300} defaultValue={initialIntroduction} onInput={(event) => setIntroductionLength(event.currentTarget.value.length)} className={fieldClassName} aria-invalid={form.invalid('shortIntroduction')} aria-describedby="shortIntroduction-help shortIntroduction-error" /><div id="shortIntroduction-help" className="mt-2 flex justify-between gap-4 text-sm text-text-secondary"><span>Vat in enkele zinnen samen waarmee uw organisatie opdrachtgevers helpt.</span><span aria-live="polite">{300 - introductionLength} tekens over</span></div><FieldError id="shortIntroduction-error" message={form.error('shortIntroduction')} /></div>
    <div><label htmlFor="description" className="font-semibold">Over uw organisatie</label><textarea id="description" name="description" rows={7} maxLength={4000} defaultValue={form.value('description', description ?? '')} className={fieldClassName} aria-describedby="description-help" /><p id="description-help" className="mt-2 text-sm text-text-secondary">Beschrijf uw achtergrond, aanpak en de situaties waarin u organisaties ondersteunt.</p></div>
    <div><label htmlFor="workingMethod" className="font-semibold">Werkwijze</label><textarea id="workingMethod" name="workingMethod" rows={6} maxLength={3000} defaultValue={form.value('workingMethod', workingMethod ?? '')} className={fieldClassName} aria-describedby="workingMethod-help" /><p id="workingMethod-help" className="mt-2 text-sm text-text-secondary">Leg uit hoe u een opdracht doorgaans aanpakt. Vermeld geen beschikbaarheid of planning.</p></div>
    <Button type="submit" loading={form.pending}>Opslaan</Button>
  </form>
}
