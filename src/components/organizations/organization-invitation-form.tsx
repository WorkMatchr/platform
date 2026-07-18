'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { OrganizationInvitationActionState } from '@/app/organisatie/gebruikers/actions'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

type Props = {
  action: (state: OrganizationInvitationActionState, formData: FormData) => Promise<OrganizationInvitationActionState>
  idempotencyKey: string
  canInviteAdmin: boolean
}

export function OrganizationInvitationForm({ action, idempotencyKey, canInviteAdmin }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const error = (field: string) => state.errors?.[field]?.[0]
  const inputClass = (field: string) => `${fieldClassName}${error(field) ? ' border-error ring-1 ring-error/30' : ''}`

  useEffect(() => {
    if (!state.errors) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [state.errors])

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-5 grid gap-5 md:grid-cols-2">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {state.message && <div className="md:col-span-2"><StatusMessage error={state.error}>{state.message}</StatusMessage></div>}
      <div>
        <label htmlFor="invitation-display-name" className="font-semibold">Naam <span aria-hidden="true">*</span></label>
        <input id="invitation-display-name" name="displayName" autoComplete="name" required maxLength={100}
          defaultValue={state.values?.displayName ?? ''} className={inputClass('displayName')}
          aria-invalid={Boolean(error('displayName'))} aria-describedby={error('displayName') ? 'invitation-display-name-error' : undefined} />
        <FieldError id="invitation-display-name-error" message={error('displayName')} />
      </div>
      <div>
        <label htmlFor="invitation-email" className="font-semibold">E-mailadres <span aria-hidden="true">*</span></label>
        <input id="invitation-email" name="email" type="email" autoComplete="email" required maxLength={254}
          defaultValue={state.values?.email ?? ''} className={inputClass('email')}
          aria-invalid={Boolean(error('email'))} aria-describedby={error('email') ? 'invitation-email-error' : undefined} />
        <FieldError id="invitation-email-error" message={error('email')} />
      </div>
      <div>
        <label htmlFor="invitation-role" className="font-semibold">Rol <span aria-hidden="true">*</span></label>
        <select id="invitation-role" name="role" required defaultValue={state.values?.role ?? 'MEMBER'}
          className={inputClass('role')} aria-invalid={Boolean(error('role'))}
          aria-describedby={error('role') ? 'invitation-role-error' : 'invitation-role-help'}>
          <option value="MEMBER">Lid</option>
          {canInviteAdmin && <option value="ADMIN">Beheerder</option>}
        </select>
        <p id="invitation-role-help" className="mt-2 text-sm text-text-secondary">Een eigenaar wordt uitsluitend via de beschermde OWNER-flow toegevoegd.</p>
        <FieldError id="invitation-role-error" message={error('role')} />
      </div>
      <div className="flex items-end">
        <Button type="submit" loading={pending}>Uitnodiging versturen</Button>
      </div>
    </form>
  )
}
