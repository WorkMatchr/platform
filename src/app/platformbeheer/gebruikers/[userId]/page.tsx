import { notFound } from 'next/navigation'
import { changePlatformUserStatusAction } from '@/app/platformbeheer/actions'
import {
  PlatformAdminEmailForm,
  PlatformAdminNoteForm,
  PlatformTwoFactorResetForm,
  PlatformUserAccessActions,
} from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { PlatformAdminAuditRow } from '@/components/platform-admin/platform-admin-audit-row'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminObjectActivity, getPlatformUserDetail } from '@/lib/platform-admin/platform-admin-query-service'
import { organizationRoleLabels, platformRoleLabels, userStatusLabels } from '@/lib/presentation/platform-labels'

export default async function PlatformUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await params
  const query = await searchParams
  const returnTo = `/platformbeheer/gebruikers/${userId}`
  const administrator = await requirePlatformAdministrator(`/platformbeheer/gebruikers/${userId}`)
  const [user, adminActivity] = await Promise.all([
    getPlatformUserDetail(administrator.id, userId),
    getPlatformAdminObjectActivity(administrator.id, 'User', userId),
  ])
  if (!user) notFound()
  const membership = user.memberships[0]
  const hasVerifiedTwoFactor = user.twoFactorEnabled && user.twoFactors.some((factor) => factor.verified)
  const manageable = membership && !membership.organization.systemKey && (user.status === 'ACTIVE' || user.status === 'BLOCKED')
  const events = [
    ...user.provisioningEventsAsSubject.map((event) => ({ id: `account-${event.id}`, source: 'Account', action: event.eventType, reason: event.reasonCode, at: event.occurredAt })),
    ...user.membershipEventsAsSubject.map((event) => ({ id: `membership-${event.id}`, source: 'Membership', action: event.eventType, reason: event.reasonCode, at: event.occurredAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())
  return (
    <>
      <AdminPageHeader title={user.displayName ?? 'Naam niet ingevuld'} description={user.email} action={<StatusPill tone={user.status === 'ACTIVE' ? 'good' : user.status === 'BLOCKED' ? 'bad' : 'warning'}>{userStatusLabels[user.status]}</StatusPill>} />
      {query.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is uitgevoerd en vastgelegd.</p> : null}
      {query.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie is niet uitgevoerd. Er zijn geen wijzigingen doorgevoerd. Controleer de gegevens en uw bevoegdheid en probeer het opnieuw.</p> : null}
      <AdminSection title="Beheeracties" description="Communicatie, toegang en notities blijven afzonderlijk en auditbaar.">
        <div className="grid gap-3 xl:grid-cols-2">
          <PlatformAdminEmailForm targetType="USER" targetId={user.id} returnTo={returnTo} />
          <PlatformAdminNoteForm targetType="USER" targetId={user.id} returnTo={returnTo} category="Gebruikers" />
          <PlatformTwoFactorResetForm userId={user.id} returnTo={returnTo} enabled={user.twoFactorEnabled || user.twoFactors.length > 0} />
        </div>
        <div className="mt-3">
          <PlatformUserAccessActions
            userId={user.id}
            returnTo={returnTo}
            canActivate={user.status === 'INVITED' && membership?.status === 'INVITED'}
            canVerify={
              !user.emailVerified &&
              !(user.status === 'INVITED' && membership?.status === 'INVITED') &&
              (user.status === 'INVITED' || user.status === 'ACTIVE')
            }
            canReset={user.status === 'ACTIVE'}
          />
        </div>
      </AdminSection>
      {manageable ? <form action={changePlatformUserStatusAction} className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
        <input type="hidden" name="organizationId" value={membership.organization.id} /><input type="hidden" name="subjectUserId" value={user.id} /><input type="hidden" name="operation" value={user.status === 'ACTIVE' ? 'block' : 'unblock'} />
        <label className="grid flex-1 gap-1 text-xs font-semibold text-text-secondary">Reden<input className="min-h-10 rounded-control border border-border px-3 text-sm" name="reasonNote" required minLength={5} maxLength={500} /></label>
        <button className="min-h-10 rounded-control border border-border px-4 text-sm font-semibold" type="submit">{user.status === 'ACTIVE' ? 'Account blokkeren' : 'Account deblokkeren'}</button>
      </form> : null}
      <AdminSection title="Accountcontext">
        <dl className="grid gap-3 rounded-card border border-border bg-surface p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div><dt className="text-xs text-text-secondary">Platformrol</dt><dd className="font-semibold">{platformRoleLabels[user.platformRole]}</dd></div>
          <div><dt className="text-xs text-text-secondary">Organisatie</dt><dd className="font-semibold">{membership?.organization.name ?? 'Geen organisatie'}</dd></div>
          <div><dt className="text-xs text-text-secondary">Organisatierol</dt><dd className="font-semibold">{membership ? organizationRoleLabels[membership.role] : 'Niet van toepassing'}</dd></div>
          <div><dt className="text-xs text-text-secondary">E-mail geverifieerd</dt><dd className="font-semibold">{user.emailVerified ? 'Ja' : 'Nee'}</dd></div>
          <div><dt className="text-xs text-text-secondary">Tweestapsverificatie</dt><dd className="font-semibold">{hasVerifiedTwoFactor ? 'Ingeschakeld' : 'Niet ingesteld of niet volledig afgerond'}</dd></div>
        </dl>
      </AdminSection>
      <AdminSection title="Levenscyclus"><AdminTable headers={['Bron', 'Gebeurtenis', 'Reden', 'Moment']}>{events.map((event) => <tr key={event.id}><td className="px-4 py-3">{event.source}</td><td className="px-4 py-3 font-semibold">{event.action}</td><td className="px-4 py-3">{event.reason ?? '—'}</td><td className="px-4 py-3">{event.at.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Beheeraudit"><AdminTable headers={['Actie', 'Auteur', 'Toelichting', 'Moment']}>{adminActivity.map((event) => <PlatformAdminAuditRow event={event} key={event.id} />)}</AdminTable></AdminSection>
      <AdminSection title="Recente sessies"><AdminTable headers={['Aangemaakt', 'Laatst gebruikt', 'Verloopt']}>{user.sessions.map((session) => <tr key={session.id}><td className="px-4 py-3">{session.createdAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{session.updatedAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{session.expiresAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
    </>
  )
}
