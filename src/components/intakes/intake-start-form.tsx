'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { IntakeActionState } from '@/app/hulpvragen/actions'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'

export function IntakeStartForm({
  action,
  organizationId,
}: {
  action: (state: IntakeActionState, formData: FormData) => Promise<IntakeActionState>
  organizationId: string
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const error = state.errors?.freeText?.[0]
  const value = typeof state.values?.freeText === 'string' ? state.values.freeText : ''

  useEffect(() => {
    if (error) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [error, state.values])

  return (
    <form ref={formRef} key={value || 'initial'} action={formAction} noValidate>
      <input type="hidden" name="organizationId" value={organizationId} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <div className={state.message ? 'mt-6' : ''}>
        <label htmlFor="freeText" className="font-semibold text-brand-dark">
          Waarbij heeft Uw organisatie hulp nodig? <span aria-hidden="true">*</span>
        </label>
        <p id="freeText-help" className="mt-2 text-sm text-text-secondary">
          Beschrijf kort wat er speelt. Vermeld geen namen, medische gegevens, BSN’s, wachtwoorden of andere
          vertrouwelijke persoonsgegevens.
        </p>
        <textarea
          id="freeText"
          name="freeText"
          required
          minLength={20}
          maxLength={2000}
          rows={7}
          defaultValue={value}
          className={`${fieldClassName} resize-y${error ? ' border-error ring-1 ring-error/30' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={`freeText-help${error ? ' freeText-error' : ''}`}
        />
        <div className="mt-1 flex justify-between gap-4 text-sm text-text-secondary">
          <span>Minimaal 20 tekens</span>
          <span>Maximaal 2.000 tekens</span>
        </div>
        <FieldError id="freeText-error" message={error} />
      </div>
      <Button type="submit" loading={pending} className="mt-7 w-full sm:w-auto">
        Hulpvraag starten
      </Button>
    </form>
  )
}
