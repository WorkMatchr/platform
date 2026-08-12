'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { IntakeActionState } from '@/app/hulpvragen/actions'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'

export function IntakeStartForm({
  action,
  organizationId,
  knowledgeContextId,
  label = 'Waarbij heeft uw organisatie hulp nodig?',
  helpText = 'Beschrijf kort wat er speelt. Vermeld geen namen, medische gegevens, BSN’s, wachtwoorden of andere vertrouwelijke persoonsgegevens.',
}: {
  action: (state: IntakeActionState, formData: FormData) => Promise<IntakeActionState>
  organizationId: string
  knowledgeContextId?: string
  label?: string
  helpText?: string
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
      {knowledgeContextId && <input type="hidden" name="knowledgeContextId" value={knowledgeContextId} />}
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <div className={state.message ? 'mt-6' : ''}>
        <label htmlFor="freeText" className="font-semibold text-brand-dark">
          {label} <span aria-hidden="true">*</span>
        </label>
        <p id="freeText-help" className="mt-2 text-sm text-text-secondary">
          {helpText}
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
        Doorgaan
      </Button>
    </form>
  )
}
