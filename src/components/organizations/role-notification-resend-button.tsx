'use client'

import { useActionState } from 'react'
import type { OrganizationRoleActionState } from '@/app/organisatie/gebruikers/actions'
import { Button } from '@/components/ui/button'

type Props = {
  action: (state: OrganizationRoleActionState, formData: FormData) => Promise<OrganizationRoleActionState>
  organizationId: string
  subjectUserId: string
  idempotencyKey: string
}

export function RoleNotificationResendButton({ action, organizationId, subjectUserId, idempotencyKey }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form action={formAction} className="flex max-w-sm flex-col items-start gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="subjectUserId" value={subjectUserId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Button type="submit" variant="ghost" loading={pending}>Rolnotificatie opnieuw versturen</Button>
      {state.message && (
        <p role={state.error ? 'alert' : 'status'} className={state.error ? 'text-sm text-error' : 'text-sm text-success'}>
          {state.message}
        </p>
      )}
    </form>
  )
}
