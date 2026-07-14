'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { AssignmentStatus } from '@/generated/prisma/client'
import type { AssignmentActionState } from '@/app/opdrachten/actions'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'

type Action = (state: AssignmentActionState, formData: FormData) => Promise<AssignmentActionState>

function ReadyForm({ action, assignmentId, version }: { action: Action; assignmentId: string; version: number }) {
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form action={formAction}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="expectedAssignmentVersion" value={version} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <p className="text-sm text-text-secondary">Gereedmelden is intern. De opdracht wordt niet gepubliceerd en matching start niet.</p>
      <Button type="submit" loading={pending} className="mt-4 w-full sm:w-auto">Gereed voor controle</Button>
    </form>
  )
}

function ReasonForm({ action, assignmentId, version, mode }: { action: Action; assignmentId: string; version: number; mode: 'reopen' | 'cancel' }) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const reasonError = state.errors?.reason?.[0]
  const confirmError = state.errors?.confirmed?.[0]
  useEffect(() => {
    if (state.errors) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [state.errors, state.values])
  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4" noValidate>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="expectedAssignmentVersion" value={version} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <div>
        <label htmlFor={`${mode}-reason`} className="font-semibold">Reden <span aria-hidden="true">*</span></label>
        <textarea id={`${mode}-reason`} name="reason" required minLength={10} maxLength={500} rows={3} defaultValue={typeof state.values?.reason === 'string' ? state.values.reason : ''} className={`${fieldClassName}${reasonError ? ' border-error ring-1 ring-error/30' : ''}`} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? `${mode}-reason-error` : undefined} />
        <FieldError id={`${mode}-reason-error`} message={reasonError} />
      </div>
      {mode === 'cancel' && (
        <div>
          <label className={`flex items-start gap-3 rounded-control border p-4 ${confirmError ? 'border-error' : 'border-border'}`}>
            <input type="checkbox" name="confirmed" className="mt-1" defaultChecked={state.values?.confirmed === 'on'} aria-invalid={Boolean(confirmError)} aria-describedby={confirmError ? 'cancel-confirm-error' : undefined} />
            <span>Ik bevestig dat deze opdracht moet worden geannuleerd. De opdracht en historie worden niet verwijderd.</span>
          </label>
          <FieldError id="cancel-confirm-error" message={confirmError} />
        </div>
      )}
      <Button type="submit" loading={pending} variant={mode === 'cancel' ? 'outline' : 'primary'}>
        {mode === 'cancel' ? 'Opdracht annuleren' : 'Terugzetten naar concept'}
      </Button>
    </form>
  )
}

export function AssignmentStatusActions({ assignmentId, status, version, actions }: { assignmentId: string; status: AssignmentStatus; version: number; actions: { ready: Action; reopen: Action; cancel: Action } }) {
  if (status !== 'DRAFT' && status !== 'READY_FOR_REVIEW') return null
  return (
    <section className="rounded-card border border-border bg-surface p-6" aria-labelledby="assignment-actions-title">
      <h2 id="assignment-actions-title" className="text-xl font-bold text-brand-dark">Vervolgstap</h2>
      {status === 'DRAFT' && (
        <div className="mt-5 space-y-6">
          <LinkButton href={`/opdrachten/${assignmentId}/bewerken`}>Concept bewerken</LinkButton>
          <ReadyForm action={actions.ready} assignmentId={assignmentId} version={version} />
        </div>
      )}
      {status === 'READY_FOR_REVIEW' && (
        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-4 text-sm text-text-secondary">Controleer de definitieve gegevens en bevestig daarna afzonderlijk de publicatie.</p>
            <LinkButton href={`/opdrachten/${assignmentId}/publiceren`}>Publicatie controleren</LinkButton>
          </div>
          <details className="rounded-control border border-border p-4">
            <summary className="min-h-11 cursor-pointer font-semibold text-brand-dark">Terug voor correctie</summary>
            <ReasonForm action={actions.reopen} assignmentId={assignmentId} version={version} mode="reopen" />
          </details>
        </div>
      )}
      {(status === 'DRAFT' || status === 'READY_FOR_REVIEW') && (
        <details className="mt-5 rounded-control border border-border p-4">
          <summary className="min-h-11 cursor-pointer font-semibold text-brand-dark">Opdracht annuleren</summary>
          <ReasonForm action={actions.cancel} assignmentId={assignmentId} version={version} mode="cancel" />
        </details>
      )}
    </section>
  )
}
