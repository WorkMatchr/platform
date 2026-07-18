'use client'

import { useActionState, useRef } from 'react'
import type { OrganizationRoleActionState } from '@/app/organisatie/gebruikers/actions'
import { Button, buttonBaseStyles, buttonVariantStyles } from '@/components/ui/button'

type RoleAction = (
  state: OrganizationRoleActionState,
  formData: FormData,
) => Promise<OrganizationRoleActionState>

const labels = { ADMIN: 'Beheerder', MEMBER: 'Lid' } as const

export function OrganizationRoleDialog({
  displayName,
  organizationId,
  subjectUserId,
  currentRole,
  idempotencyKey,
  action,
}: {
  displayName: string
  organizationId: string
  subjectUserId: string
  currentRole: 'ADMIN' | 'MEMBER'
  idempotencyKey: string
  action: RoleAction
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [state, formAction, pending] = useActionState(action, {})
  const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${buttonBaseStyles} ${buttonVariantStyles.outline}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        Rol wijzigen
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => triggerRef.current?.focus()}
        aria-labelledby={`role-${subjectUserId}-title`}
        className="w-[min(92vw,36rem)] rounded-card border border-border bg-surface p-0 text-text-primary shadow-card backdrop:bg-brand-dark/55"
      >
        <form action={formAction} className="p-6 sm:p-8">
          <h2 id={`role-${subjectUserId}-title`} className="text-xl font-bold text-brand-dark">Rol wijzigen</h2>
          <p className="mt-3 break-words text-sm text-text-secondary">
            U wijzigt de rol van {displayName} van <strong>{labels[currentRole]}</strong> naar <strong>{labels[newRole]}</strong>.
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            Alle actieve sessies worden direct beëindigd. De gebruiker moet opnieuw inloggen met de actuele bevoegdheden.
          </p>
          {newRole === 'MEMBER' && (
            <p className="mt-3 rounded-control bg-warning/10 p-3 text-sm text-brand-dark">
              Na deze wijziging vervallen de beheerrechten direct.
            </p>
          )}
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="subjectUserId" value={subjectUserId} />
          <input type="hidden" name="expectedRole" value={currentRole} />
          <input type="hidden" name="newRole" value={newRole} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input type="checkbox" name="confirmed" required className="mt-1 size-5 shrink-0" />
            <span>Ik bevestig dat deze rolwijziging namens de organisatie mag worden uitgevoerd.</span>
          </label>
          {state.message && (
            <p role="alert" className="mt-4 rounded-control bg-error/10 p-3 text-sm text-error">{state.message}</p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()} disabled={pending}>Annuleren</Button>
            <Button type="submit" variant="primary" loading={pending}>Rol wijzigen</Button>
          </div>
        </form>
      </dialog>
    </>
  )
}
