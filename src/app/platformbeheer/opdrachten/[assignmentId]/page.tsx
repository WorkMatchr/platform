import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlatformAdminEmailForm, PlatformAdminNoteForm } from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { PlatformAdminAuditRow } from '@/components/platform-admin/platform-admin-audit-row'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import {
  getPlatformAdminObjectActivity,
  getPlatformAssignmentDetail,
} from '@/lib/platform-admin/platform-admin-query-service'
import { assignmentStatusLabels } from '@/lib/assignments/assignment-presentation'

export default async function PlatformAssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { assignmentId } = await params
  const query = await searchParams
  const returnTo = `/platformbeheer/opdrachten/${assignmentId}`
  const administrator = await requirePlatformAdministrator(returnTo)
  const [assignment, adminActivity] = await Promise.all([
    getPlatformAssignmentDetail(administrator.id, assignmentId),
    getPlatformAdminObjectActivity(administrator.id, 'Assignment', assignmentId),
  ])
  if (!assignment) notFound()
  const providers = new Map<string, { id: string; name: string }>()
  for (const selection of assignment.providerSelections) {
    providers.set(selection.providerProfile.id, { id: selection.providerProfile.id, name: selection.providerProfile.organization.name })
  }
  for (const invitation of assignment.marketplaceInvitations) {
    providers.set(invitation.providerProfile.id, { id: invitation.providerProfile.id, name: invitation.providerProfile.organization.name })
  }
  return (
    <>
      <AdminPageHeader
        title={assignment.title}
        description={`Opdracht van ${assignment.clientOrganization.name}.`}
        action={<StatusPill>{assignmentStatusLabels[assignment.status]}</StatusPill>}
      />
      {query.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is uitgevoerd en vastgelegd.</p> : null}
      {query.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie is niet uitgevoerd. Er zijn geen wijzigingen doorgevoerd. Controleer de gegevens en uw bevoegdheid en probeer het opnieuw.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Link className="inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary" href="/platformbeheer/opdrachten">Terug naar opdrachten</Link>
        <Link className="inline-flex min-h-10 items-center rounded-control border border-border px-4 text-sm font-semibold" href="/platformbeheer/auditor">Audit openen</Link>
      </div>
      <AdminSection title="Opdrachtgever">
        <PlatformAdminEmailForm targetType="ORGANIZATION" targetId={assignment.clientOrganization.id} returnTo={returnTo} label="Opdrachtgever mailen" />
      </AdminSection>
      <AdminSection title="Geselecteerde dienstverleners" description="Ieder bericht wordt afzonderlijk verstuurd; er is geen massamailfunctie.">
        <div className="grid gap-3 lg:grid-cols-2">
          {[...providers.values()].map((provider) => (
            <section className="rounded-card border border-border bg-surface p-4" key={provider.id}>
              <h3 className="mb-3 font-bold text-brand-dark">{provider.name}</h3>
              <PlatformAdminEmailForm targetType="PROVIDER" targetId={provider.id} returnTo={returnTo} label="Dienstverlener mailen" />
            </section>
          ))}
          {providers.size === 0 ? <p className="text-sm text-text-secondary">Er zijn geen geselecteerde of uitgenodigde dienstverleners.</p> : null}
        </div>
      </AdminSection>
      <AdminSection title="Onderzoek en interne vastlegging">
        <PlatformAdminNoteForm
          targetType="ASSIGNMENT"
          targetId={assignment.id}
          returnTo={returnTo}
          category="Opdrachten"
          operation="MARK_INVESTIGATED"
          label="Signaal markeren als onderzocht"
        />
      </AdminSection>
      <AdminSection title="Statushistorie"><AdminTable headers={['Van', 'Naar', 'Reden', 'Moment']}>{assignment.statusHistory.map((event) => <tr key={event.id}><td className="px-4 py-3">{event.fromStatus ? assignmentStatusLabels[event.fromStatus] : 'Nieuw'}</td><td className="px-4 py-3 font-semibold">{assignmentStatusLabels[event.toStatus]}</td><td className="px-4 py-3">{event.reason ?? '—'}</td><td className="px-4 py-3">{event.createdAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Beheeraudit"><AdminTable headers={['Actie', 'Auteur', 'Toelichting', 'Moment']}>{adminActivity.map((event) => <PlatformAdminAuditRow event={event} key={event.id} />)}</AdminTable></AdminSection>
    </>
  )
}
