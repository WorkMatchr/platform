import type { PlatformActionStatus } from '@/lib/platform-admin/platform-admin-action-center'
import { platformActionStatusLabels, platformActionStatuses } from '@/lib/platform-admin/platform-admin-action-center'
import {
  addPlatformAdminNoteAction,
  resetPlatformUserTwoFactorAction,
  sendPlatformAdminEmailAction,
  sendPlatformUserAccessEmailAction,
  updatePlatformSignalStatusAction,
} from '@/app/platformbeheer/actions'

const fieldClass = 'min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm'
const buttonClass = 'inline-flex min-h-10 items-center justify-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle'

export function PlatformAdminEmailForm({
  targetType,
  targetId,
  returnTo,
  label = 'E-mail sturen',
}: {
  targetType: 'USER' | 'ORGANIZATION' | 'PROVIDER'
  targetId: string
  returnTo: string
  label?: string
}) {
  return (
    <details className="rounded-card border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold text-brand-dark">{label}</summary>
      <form action={sendPlatformAdminEmailAction} className="mt-4 grid gap-3">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="grid gap-1 text-sm font-semibold">Onderwerp<input className={fieldClass} name="subject" required minLength={3} maxLength={160} /></label>
        <label className="grid gap-1 text-sm font-semibold">Bericht<textarea className={`${fieldClass} min-h-28 py-3`} name="message" required minLength={10} maxLength={4000} /></label>
        <p className="text-xs leading-5 text-text-secondary">Gebruik dit bericht niet voor wachtwoorden, beveiligingscodes, medische gegevens of andere bijzondere/gevoelige persoonsgegevens. Verzonden beheercommunicatie wordt voor auditdoeleinden bewaard.</p>
        <button className={`${buttonClass} justify-self-start`} type="submit">Mail</button>
      </form>
    </details>
  )
}

export function PlatformAdminNoteForm({
  targetType,
  targetId,
  returnTo,
  category,
  operation = 'NOTE',
  label = 'Interne beheernotitie',
}: {
  targetType: 'USER' | 'ORGANIZATION' | 'PROVIDER' | 'ASSIGNMENT'
  targetId: string
  returnTo: string
  category: string
  operation?: 'NOTE' | 'MARK_INVESTIGATED'
  label?: string
}) {
  return (
    <details className="rounded-card border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold text-brand-dark">{label}</summary>
      <form action={addPlatformAdminNoteAction} className="mt-4 grid gap-3">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="operation" value={operation} />
        <label className="grid gap-1 text-sm font-semibold">Notitie<textarea className={`${fieldClass} min-h-24 py-3`} name="text" required minLength={5} maxLength={2000} /></label>
        <p className="text-xs text-text-secondary">Alleen zichtbaar binnen Platformbeheer en append-only vastgelegd.</p>
        <button className={`${buttonClass} justify-self-start`} type="submit">Notitie vastleggen</button>
      </form>
    </details>
  )
}

export function PlatformUserAccessActions({
  userId,
  returnTo,
  canActivate,
  canVerify,
  canReset,
}: {
  userId: string
  returnTo: string
  canActivate: boolean
  canVerify: boolean
  canReset: boolean
}) {
  const actions = [
    canActivate ? { operation: 'ACTIVATION', label: 'Activatiemail opnieuw versturen' } : null,
    canVerify ? { operation: 'VERIFICATION', label: 'Verificatiemail opnieuw versturen' } : null,
    canReset ? { operation: 'PASSWORD_RESET', label: 'Wachtwoordreset versturen' } : null,
  ].filter((item): item is { operation: 'ACTIVATION' | 'VERIFICATION' | 'PASSWORD_RESET'; label: string } => Boolean(item))
  if (actions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((item) => (
        <form action={sendPlatformUserAccessEmailAction} key={item.operation}>
          <input type="hidden" name="subjectUserId" value={userId} />
          <input type="hidden" name="operation" value={item.operation} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className={buttonClass} type="submit">{item.label}</button>
        </form>
      ))}
    </div>
  )
}

export function PlatformTwoFactorResetForm({ userId, returnTo, enabled }: { userId: string; returnTo: string; enabled: boolean }) {
  return (
    <details className="rounded-card border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold text-brand-dark">Tweestapsverificatie resetten</summary>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        Status: <strong>{enabled ? 'Ingeschakeld' : 'Niet ingesteld of niet volledig afgerond'}</strong>. Een reset verwijdert uitsluitend de ingestelde tweede factor en beëindigt alle actieve sessies van dit account.
      </p>
      {enabled ? (
        <form action={resetPlatformUserTwoFactorAction} className="mt-4 grid gap-3">
          <input type="hidden" name="subjectUserId" value={userId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="grid gap-1 text-sm font-semibold">Reden<textarea className={`${fieldClass} min-h-24 py-3`} name="reason" required minLength={10} maxLength={500} /></label>
          <label className="flex items-start gap-2 text-sm leading-6"><input className="mt-1" type="checkbox" name="confirmed" required />Ik bevestig dat de identiteit van de gebruiker is gecontroleerd en dat alle bestaande sessies worden beëindigd.</label>
          <button className={`${buttonClass} justify-self-start`} type="submit">Tweestapsverificatie resetten</button>
        </form>
      ) : <p className="mt-3 text-sm text-text-secondary">Er is geen actieve tweestapsverificatie om te resetten.</p>}
    </details>
  )
}

export function PlatformSignalStatusForm({
  signalId,
  currentStatus,
}: {
  signalId: string
  currentStatus: PlatformActionStatus
}) {
  return (
    <form action={updatePlatformSignalStatusAction} className="grid gap-2 sm:grid-cols-[minmax(12rem,0.6fr)_minmax(14rem,1fr)_auto] sm:items-end">
      <input type="hidden" name="signalId" value={signalId} />
      <label className="grid gap-1 text-xs font-semibold text-text-secondary">Status
        <select className={fieldClass} name="status" defaultValue={currentStatus}>
          {platformActionStatuses.map((status) => <option key={status} value={status}>{platformActionStatusLabels[status]}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-text-secondary">Toelichting
        <input className={fieldClass} name="note" minLength={5} maxLength={500} />
      </label>
      <button className={buttonClass} type="submit">Vastleggen</button>
    </form>
  )
}
