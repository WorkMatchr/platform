'use client'

import { useActionState } from 'react'
import type { OrganizationInvitationActionState } from '@/app/organisatie/gebruikers/actions'

type Props = {
  action: (state: OrganizationInvitationActionState, formData: FormData) => Promise<OrganizationInvitationActionState>
  organizationId: string
  subjectUserId: string
  idempotencyKey: string
}

const initialState: OrganizationInvitationActionState = {}

export function InvitationResendButton({ action, organizationId, subjectUserId, idempotencyKey }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="flex max-w-sm flex-col items-start gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="subjectUserId" value={subjectUserId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Uitnodiging opnieuw versturen"
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 py-2 text-sm font-semibold text-brand-dark hover:border-brand-primary disabled:cursor-wait disabled:opacity-70"
      >
        <span aria-hidden="true">↻</span>
        {pending ? 'Versturen…' : 'Opnieuw versturen'}
      </button>
      {state.message && (
        <p role={state.error ? 'alert' : 'status'} className={state.error ? 'text-sm text-error' : 'text-sm text-success'}>
          {state.message}
        </p>
      )}
    </form>
  )
}
