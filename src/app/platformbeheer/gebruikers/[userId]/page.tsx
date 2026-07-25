import { notFound } from 'next/navigation'
import { changePlatformUserStatusAction } from '@/app/platformbeheer/actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformUserDetail } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const administrator = await requirePlatformAdministrator(`/platformbeheer/gebruikers/${userId}`)
  const user = await getPlatformUserDetail(administrator.id, userId)
  if (!user) notFound()
  const membership = user.memberships[0]
  const manageable = membership && !membership.organization.systemKey && (user.status === 'ACTIVE' || user.status === 'BLOCKED')
  const events = [
    ...user.provisioningEventsAsSubject.map((event) => ({ id: `account-${event.id}`, source: 'Account', action: event.eventType, reason: event.reasonCode, at: event.occurredAt })),
    ...user.membershipEventsAsSubject.map((event) => ({ id: `membership-${event.id}`, source: 'Membership', action: event.eventType, reason: event.reasonCode, at: event.occurredAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())
  return (
    <>
      <AdminPageHeader title={user.displayName ?? 'Naam niet ingevuld'} description={user.email} action={<StatusPill tone={user.status === 'ACTIVE' ? 'good' : user.status === 'BLOCKED' ? 'bad' : 'warning'}>{user.status}</StatusPill>} />
      {manageable ? <form action={changePlatformUserStatusAction} className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
        <input type="hidden" name="organizationId" value={membership.organization.id} /><input type="hidden" name="subjectUserId" value={user.id} /><input type="hidden" name="operation" value={user.status === 'ACTIVE' ? 'block' : 'unblock'} />
        <label className="grid flex-1 gap-1 text-xs font-semibold text-text-secondary">Reden<input className="min-h-10 rounded-control border border-border px-3 text-sm" name="reasonNote" required minLength={5} maxLength={500} /></label>
        <button className="min-h-10 rounded-control border border-border px-4 text-sm font-semibold" type="submit">{user.status === 'ACTIVE' ? 'Account blokkeren' : 'Account deblokkeren'}</button>
      </form> : null}
      <AdminSection title="Accountcontext">
        <dl className="grid gap-3 rounded-card border border-border bg-surface p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div><dt className="text-xs text-text-secondary">Platformrol</dt><dd className="font-semibold">{user.platformRole}</dd></div>
          <div><dt className="text-xs text-text-secondary">Organisatie</dt><dd className="font-semibold">{membership?.organization.name ?? 'Geen organisatie'}</dd></div>
          <div><dt className="text-xs text-text-secondary">Organisatierol</dt><dd className="font-semibold">{membership?.role ?? 'Niet van toepassing'}</dd></div>
          <div><dt className="text-xs text-text-secondary">E-mail geverifieerd</dt><dd className="font-semibold">{user.emailVerified ? 'Ja' : 'Nee'}</dd></div>
        </dl>
      </AdminSection>
      <AdminSection title="Lifecycle"><AdminTable headers={['Bron', 'Gebeurtenis', 'Reden', 'Moment']}>{events.map((event) => <tr key={event.id}><td className="px-4 py-3">{event.source}</td><td className="px-4 py-3 font-semibold">{event.action}</td><td className="px-4 py-3">{event.reason ?? '—'}</td><td className="px-4 py-3">{event.at.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Recente sessies"><AdminTable headers={['Aangemaakt', 'Laatst gebruikt', 'Verloopt']}>{user.sessions.map((session) => <tr key={session.id}><td className="px-4 py-3">{session.createdAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{session.updatedAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{session.expiresAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
    </>
  )
}
