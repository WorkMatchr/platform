'use client'

import { ActionForm } from '@/components/ui/action-form'

import { usePendingAction } from '@/components/ui/use-pending-action'

import type { OrganizationRoleActionState } from '@/app/organisatie/gebruikers/actions'
import { Button } from '@/components/ui/button'

type Props = {
  action: (state: OrganizationRoleActionState, formData: FormData) => Promise<OrganizationRoleActionState>
  organizationId: string
  subjectUserId: string
  idempotencyKey: string
}

export function RoleNotificationResendButton({ action, organizationId, subjectUserId, idempotencyKey }: Props) {
  const [state, formAction, pending] = usePendingAction(action, {})
  return (
    <ActionForm action={formAction} className="flex max-w-sm flex-col items-start gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="subjectUserId" value={subjectUserId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Button type="submit" variant="ghost" loading={pending}>Rolnotificatie opnieuw versturen</Button>
      {state.message && (
        <p role={state.error ? 'alert' : 'status'} className={state.error ? 'text-sm text-error' : 'text-sm text-success'}>
          {state.message}
        </p>
      )}
    </ActionForm>
  )
}
