import Link from 'next/link'
import { notFound } from 'next/navigation'
import { changePlatformOrganizationStatusAction } from '@/app/platformbeheer/actions'
import { PlatformAdminEmailForm, PlatformAdminNoteForm } from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { PlatformAdminAuditRow } from '@/components/platform-admin/platform-admin-audit-row'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminObjectActivity, getPlatformOrganizationDetail } from '@/lib/platform-admin/platform-admin-query-service'
import { assignmentStatusLabels } from '@/lib/assignments/assignment-presentation'
import { organizationStatusLabels } from '@/lib/presentation/platform-labels'

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
      <AdminPageHeader title={organization.name} description="Levenscyclus, gebruikers, opdrachten en audit in één organisatiecontext." action={<StatusPill tone={organization.status === 'ACTIVE' ? 'good' : 'bad'}>{organizationStatusLabels[organization.status]}</StatusPill>} />
      {query.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is uitgevoerd en vastgelegd.</p> : null}
      {query.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie is niet uitgevoerd. Er zijn geen wijzigingen doorgevoerd. Controleer de gegevens en uw bevoegdheid en probeer het opnieuw.</p> : null}
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
      <AdminSection title="Gebruikers" description={`${organization.memberships.length} gebruiker${organization.memberships.length === 1 ? '' : 's'} gekoppeld aan deze organisatie.`}>
        <Link className="inline-flex min-h-10 items-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover" href={`/platformbeheer/organisaties/${organization.id}/gebruikers`}>
          Gebruikers beheren
        </Link>
      </AdminSection>
      <AdminSection title="Recente opdrachten"><AdminTable headers={['Opdracht', 'Status', 'Bijgewerkt']}>{organization.clientAssignments.map((assignment) => <tr key={assignment.id}><td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/opdrachten/${assignment.id}`}>{assignment.title}</Link></td><td className="px-4 py-3">{assignmentStatusLabels[assignment.status]}</td><td className="px-4 py-3">{assignment.updatedAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Audit"><AdminTable headers={['Bron', 'Actie', 'Reden', 'Moment']}>{organization.membershipEvents.map((event) => <tr key={event.id}><td className="px-4 py-3">Membership</td><td className="px-4 py-3">{event.eventType}</td><td className="px-4 py-3">{event.reasonCode}</td><td className="px-4 py-3">{event.occurredAt.toLocaleString('nl-NL')}</td></tr>)}{organization.marketplaceAuditEvents.map((event) => <tr key={event.id}><td className="px-4 py-3">Marketplace</td><td className="px-4 py-3">{event.action}</td><td className="px-4 py-3">{event.entityType}</td><td className="px-4 py-3">{event.createdAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Beheeraudit"><AdminTable headers={['Actie', 'Auteur', 'Toelichting', 'Moment']}>{adminActivity.map((event) => <PlatformAdminAuditRow event={event} key={event.id} />)}</AdminTable></AdminSection>
    </>
  )
}
