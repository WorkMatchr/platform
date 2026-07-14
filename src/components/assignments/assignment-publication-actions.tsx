'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { AssignmentActionState } from '@/app/opdrachten/actions'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

type Action = (
  state: AssignmentActionState,
  formData: FormData,
) => Promise<AssignmentActionState>

function useFirstInvalidField(state: AssignmentActionState) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.errors) {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
    }
  }, [state.errors, state.values])

  return formRef
}

export function AssignmentPublishForm({
  action,
  assignmentId,
  version,
}: {
  action: Action
  assignmentId: string
  version: number
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useFirstInvalidField(state)
  const confirmError = state.errors?.confirmed?.[0]

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="expectedAssignmentVersion" value={version} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <div>
        <label
          className={`flex items-start gap-3 rounded-control border p-4 ${confirmError ? 'border-error ring-1 ring-error/30' : 'border-border'}`}
        >
          <input
            type="checkbox"
            name="confirmed"
            className="mt-1 size-5 shrink-0"
            defaultChecked={state.values?.confirmed === 'on'}
            aria-invalid={Boolean(confirmError)}
            aria-describedby="publish-confirm-help publish-confirm-error"
          />
          <span>
            Ik bevestig dat deze opdracht definitief gereed wordt gezet voor
            marktverwerking.
          </span>
        </label>
        <p id="publish-confirm-help" className="mt-2 text-sm text-text-secondary">
          De opdracht wordt nog niet aan aanbieders getoond, matching start nog
          niet en er worden geen credits afgeschreven of betalingen gestart.
        </p>
        <FieldError id="publish-confirm-error" message={confirmError} />
      </div>
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        Opdracht publiceren
      </Button>
    </form>
  )
}

export function AssignmentWithdrawForm({
  action,
  assignmentId,
  version,
}: {
  action: Action
  assignmentId: string
  version: number
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useFirstInvalidField(state)
  const reasonError = state.errors?.reason?.[0]
  const confirmError = state.errors?.confirmed?.[0]

  return (
    <form ref={formRef} action={formAction} className="mt-5 space-y-4" noValidate>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="expectedAssignmentVersion" value={version} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <div>
        <label htmlFor="withdraw-reason" className="font-semibold">
          Reden <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="withdraw-reason"
          name="reason"
          required
          minLength={10}
          maxLength={500}
          rows={4}
          defaultValue={
            typeof state.values?.reason === 'string' ? state.values.reason : ''
          }
          className={`${fieldClassName}${reasonError ? ' border-error ring-1 ring-error/30' : ''}`}
          aria-invalid={Boolean(reasonError)}
          aria-describedby="withdraw-reason-help withdraw-reason-error"
        />
        <p id="withdraw-reason-help" className="mt-2 text-sm text-text-secondary">
          Gebruik 10 tot en met 500 tekens. Deze reden blijft in de historie.
        </p>
        <FieldError id="withdraw-reason-error" message={reasonError} />
      </div>
      <div>
        <label
          className={`flex items-start gap-3 rounded-control border p-4 ${confirmError ? 'border-error ring-1 ring-error/30' : 'border-border'}`}
        >
          <input
            type="checkbox"
            name="confirmed"
            className="mt-1 size-5 shrink-0"
            defaultChecked={state.values?.confirmed === 'on'}
            aria-invalid={Boolean(confirmError)}
            aria-describedby="withdraw-confirm-error"
          />
          <span>
            Ik bevestig dat de publicatie definitief moet worden ingetrokken.
            De opdracht en historie worden niet verwijderd.
          </span>
        </label>
        <FieldError id="withdraw-confirm-error" message={confirmError} />
      </div>
      <Button type="submit" loading={pending} variant="outline">
        Publicatie intrekken
      </Button>
    </form>
  )
}
