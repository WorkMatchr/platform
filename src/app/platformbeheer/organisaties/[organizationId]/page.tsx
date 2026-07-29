import Link from 'next/link'
import { notFound } from 'next/navigation'
import { addPlatformOrganizationOwnerAction, changePlatformOrganizationStatusAction, changePlatformUserStatusAction } from '@/app/platformbeheer/actions'
import { PlatformAdminEmailForm, PlatformAdminNoteForm } from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminObjectActivity, getPlatformOrganizationDetail } from '@/lib/platform-admin/platform-admin-query-service'

const statusLabels = { PENDING: 'In afwachting', ACTIVE: 'Actief', SUSPENDED: 'Geblokkeerd', ARCHIVED: 'Gearchiveerd' } as const

export default async function PlatformOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { organizationId } = await params
  const query = await searchParams
  const returnTo = `/platformbeheer/organisaties/${organizationId}`
  const administrator = await requirePlatformAdministrator(`/platformbeheer/organisaties/${organizationId}`)
  const [organization, adminActivity] = await Promise.all([
    getPlatformOrganizationDetail(administrator.id, organizationId),
    getPlatformAdminObjectActivity(administrator.id, 'Organization', organizationId),
  ])
  if (!organization) notFound()
  return (
    <>
      <AdminPageHeader title={organization.name} description="Lifecycle, gebruikers, opdrachten en audit in één organisatiecontext." action={<StatusPill tone={organization.status === 'ACTIVE' ? 'good' : 'bad'}>{statusLabels[organization.status]}</StatusPill>} />
      {query.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is uitgevoerd en vastgelegd.</p> : null}
      {query.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie kon niet veilig worden uitgevoerd.</p> : null}
      <AdminSection title="Communicatie en vastlegging">
        <div className="grid gap-3 xl:grid-cols-2">
          <PlatformAdminEmailForm targetType="ORGANIZATION" targetId={organization.id} returnTo={returnTo} label="Organisatie mailen" />
          <PlatformAdminNoteForm targetType="ORGANIZATION" targetId={organization.id} returnTo={returnTo} category="Organisaties" />
        </div>
      </AdminSection>
      {(organization.status === 'ACTIVE' || organization.status === 'SUSPENDED') ? (
        <form action={changePlatformOrganizationStatusAction} className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
          <input type="hidden" name="organizationId" value={organization.id} />
          <input type="hidden" name="operation" value={organization.status === 'ACTIVE' ? 'block' : 'unblock'} />
          <label className="grid flex-1 gap-1 text-xs font-semibold text-text-secondary">Reden
            <input className="min-h-10 rounded-control border border-border px-3 text-sm" name="reason" required minLength={5} maxLength={500} />
          </label>
          <button className="min-h-10 rounded-control border border-border px-4 text-sm font-semibold text-brand-dark" type="submit">{organization.status === 'ACTIVE' ? 'Organisatie blokkeren' : 'Organisatie deblokkeren'}</button>
        </form>
      ) : null}
      {organization.status === 'ACTIVE' && !organization.memberships.some((membership) => membership.role === 'OWNER' && membership.status === 'ACTIVE' && membership.user.status === 'ACTIVE') ? (
        <form action={addPlatformOrganizationOwnerAction} className="grid gap-3 rounded-card border border-warning-border bg-warning-subtle p-4 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(14rem,1fr)_auto] sm:items-end">
          <input type="hidden" name="organizationId" value={organization.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="grid gap-1 text-sm font-semibold">Nieuwe actieve eigenaar
            <select className="min-h-10 rounded-control border border-border bg-surface px-3" name="successorUserId" required>
              <option value="">Kies een gebruiker</option>
              {organization.memberships.filter((membership) => membership.status === 'ACTIVE' && membership.user.status === 'ACTIVE' && membership.role !== 'OWNER').map((membership) => (
                <option key={membership.id} value={membership.user.id}>{membership.user.displayName ?? membership.user.email}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Reden<input className="min-h-10 rounded-control border border-border bg-surface px-3" name="reasonNote" minLength={5} maxLength={500} required /></label>
          <button className="min-h-10 rounded-control bg-brand-primary px-4 text-sm font-semibold text-white" type="submit">OWNER aanwijzen</button>
        </form>
      ) : null}
      <AdminSection title="Gebruikers">
        <AdminTable headers={['Gebruiker', 'Rol', 'Membership', 'Account', 'Beheeractie']}>
          {organization.memberships.map((membership) => <tr key={membership.id}>
            <td className="px-4 py-3"><span className="block font-semibold">{membership.user.displayName ?? 'Naam niet ingevuld'}</span><span className="break-all text-xs text-text-secondary">{membership.user.email}</span></td>
            <td className="px-4 py-3">{membership.role}</td><td className="px-4 py-3">{membership.status}</td><td className="px-4 py-3">{membership.user.status}</td>
            <td className="px-4 py-3">{membership.user.status === 'ACTIVE' || membership.user.status === 'BLOCKED' ? <form action={changePlatformUserStatusAction} className="flex min-w-72 gap-2"><input type="hidden" name="organizationId" value={organization.id} /><input type="hidden" name="subjectUserId" value={membership.user.id} /><input type="hidden" name="operation" value={membership.user.status === 'ACTIVE' ? 'block' : 'unblock'} /><input aria-label="Reden accountactie" className="min-h-9 min-w-0 rounded-control border border-border px-2 text-xs" name="reasonNote" required minLength={5} maxLength={500} /><button className="min-h-9 rounded-control border border-border px-2 text-xs font-semibold" type="submit">{membership.user.status === 'ACTIVE' ? 'Blokkeren' : 'Deblokkeren'}</button></form> : 'Niet beschikbaar'}</td>
          </tr>)}
        </AdminTable>
      </AdminSection>
      <AdminSection title="Recente opdrachten"><AdminTable headers={['Opdracht', 'Status', 'Bijgewerkt']}>{organization.clientAssignments.map((assignment) => <tr key={assignment.id}><td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/opdrachten/${assignment.id}`}>{assignment.title}</Link></td><td className="px-4 py-3">{assignment.status}</td><td className="px-4 py-3">{assignment.updatedAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Audit"><AdminTable headers={['Bron', 'Actie', 'Reden', 'Moment']}>{organization.membershipEvents.map((event) => <tr key={event.id}><td className="px-4 py-3">Membership</td><td className="px-4 py-3">{event.eventType}</td><td className="px-4 py-3">{event.reasonCode}</td><td className="px-4 py-3">{event.occurredAt.toLocaleString('nl-NL')}</td></tr>)}{organization.marketplaceAuditEvents.map((event) => <tr key={event.id}><td className="px-4 py-3">Marketplace</td><td className="px-4 py-3">{event.action}</td><td className="px-4 py-3">{event.entityType}</td><td className="px-4 py-3">{event.createdAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Beheeraudit"><AdminTable headers={['Actie', 'Auteur', 'Toelichting', 'Moment']}>{adminActivity.map((event) => <tr key={event.id}><td className="px-4 py-3 font-semibold">{event.action}</td><td className="px-4 py-3">{event.actorUser.displayName ?? event.actorUser.email}</td><td className="max-w-xl whitespace-pre-wrap px-4 py-3">{event.reason ?? '—'}</td><td className="px-4 py-3">{event.createdAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
    </>
  )
}
