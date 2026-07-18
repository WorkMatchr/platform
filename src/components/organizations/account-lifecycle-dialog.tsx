'use client'

import { useActionState, useRef } from 'react'
import type { AccountManagementActionState } from '@/app/organisatie/gebruikers/actions'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'

type LifecycleAction = (
  state: AccountManagementActionState,
  formData: FormData,
) => Promise<AccountManagementActionState>

export function AccountLifecycleDialog({
  mode,
  displayName,
  organizationId,
  subjectUserId,
  idempotencyKey,
  action,
}: {
  mode: 'block' | 'unblock'
  displayName: string
  organizationId: string
  subjectUserId: string
  idempotencyKey: string
  action: LifecycleAction
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction, pending] = useActionState(action, {})
  const blocking = mode === 'block'
  const title = blocking ? 'Account blokkeren' : 'Account deblokkeren'

  return (
    <>
      <Button type="button" variant={blocking ? 'outline' : 'primary'} onClick={() => dialogRef.current?.showModal()}>
        {blocking ? 'Blokkeren' : 'Deblokkeren'}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${mode}-${subjectUserId}-title`}
        className="w-[min(92vw,34rem)] rounded-card border border-border bg-surface p-0 text-text-primary shadow-card backdrop:bg-brand-dark/55"
      >
        <form action={formAction} className="p-6 sm:p-8">
          <h2 id={`${mode}-${subjectUserId}-title`} className="text-xl font-bold text-brand-dark">{title}</h2>
          <p className="mt-3 text-sm text-text-secondary">
            {blocking
              ? `U blokkeert de toegang van ${displayName}. Alle actieve sessies worden ingetrokken. Het account en de historie blijven behouden.`
              : `U herstelt de toegang van ${displayName}. Oude sessies worden niet hersteld; de gebruiker moet opnieuw inloggen.`}
          </p>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="subjectUserId" value={subjectUserId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          {blocking ? (
            <div className="mt-5">
              <label htmlFor={`reason-${subjectUserId}`} className="font-semibold">Reden</label>
              <select id={`reason-${subjectUserId}`} name="reasonCode" required className={fieldClassName} defaultValue="">
                <option value="" disabled>Selecteer een reden</option>
                <option value="ORGANIZATION_REQUEST">Verzoek van de organisatie</option>
                <option value="ACCESS_NO_LONGER_REQUIRED">Toegang niet meer nodig</option>
                <option value="SECURITY_CONCERN">Beveiligingsreden</option>
                <option value="POLICY_VIOLATION">Niet voldaan aan afspraken</option>
              </select>
              <label htmlFor={`note-${subjectUserId}`} className="mt-4 block font-semibold">Toelichting <span className="font-normal text-text-secondary">(optioneel)</span></label>
              <textarea id={`note-${subjectUserId}`} name="reasonNote" maxLength={500} rows={3} className={fieldClassName} />
            </div>
          ) : <input type="hidden" name="reasonCode" value="ACCOUNT_ACCESS_RESTORED" />}
          {state.message && <p role="alert" className="mt-4 rounded-control bg-error/10 p-3 text-sm text-error">{state.message}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()} disabled={pending}>Annuleren</Button>
            <Button type="submit" variant={blocking ? 'secondary' : 'primary'} loading={pending}>{title}</Button>
          </div>
        </form>
      </dialog>
    </>
  )
}
