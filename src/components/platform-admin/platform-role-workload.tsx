import Link from 'next/link'
import { PlatformAdminEmailForm } from './platform-admin-actions'
import { AdminPageHeader, AdminSection, MetricCard, StatusPill } from './platform-admin-ui'
import { presentProviderReviewStatus } from '@/lib/providers/provider-dossier-presentation'

type Permission = 'REVIEWER' | 'APPROVER' | 'AUDITOR'

export function PlatformRoleWorkload({
  title,
  permission,
  permissions,
  data,
}: {
  title: string
  permission: Permission
  permissions: string[]
  data: {
    submitted: number
    underReview: number
    changesRequested: number
    approved: number
    rejected: number
    openCases: number
    roleContacts: Array<{ permission: string; id: string; displayName: string | null; email: string }>
    dossiers: Array<{ id: string; status: string; providerProfile: { id: string; organization: { name: string } } }>
  }
}) {
  const granted = permissions.includes(permission)
  return (
    <>
      <AdminPageHeader
        title={title}
        description="Platformbeheer geeft inzicht, maar verleent geen operationele rol. De vier-ogenregel blijft ongewijzigd."
        action={<StatusPill tone={granted ? 'good' : 'warning'}>{granted ? 'Rol actief' : 'Rol niet toegekend'}</StatusPill>}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <MetricCard label="Wacht op review" value={data.submitted} />
        <MetricCard label="In behandeling" value={data.underReview} />
        <MetricCard label="Aanvulling gevraagd" value={data.changesRequested} />
        <MetricCard label="Goedgekeurd" value={data.approved} />
        <MetricCard label="Afgekeurd" value={data.rejected} />
        <MetricCard label="Open reviewcases" value={data.openCases} />
      </div>
      <AdminSection title="Operationele toegang">
        {granted ? (
          <Link className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 text-sm font-semibold text-white" href="/beheer/dossiers">
            Open dossierwachtrij
          </Link>
        ) : (
          <p className="rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">
            Deze platformbeheerder heeft geen afzonderlijke {title.toLowerCase()}-bevoegdheid. Daardoor blijft de operationele dossierwachtrij terecht gesloten.
          </p>
        )}
      </AdminSection>
      <AdminSection title={`${title} benaderen`} description="Alleen accounts met een actuele expliciete bevoegdheid worden getoond.">
        <div className="grid gap-3 lg:grid-cols-2">
          {data.roleContacts.filter((contact) => contact.permission === permission).map((contact) => (
            <section className="rounded-card border border-border bg-surface p-4" key={contact.id}>
              <h3 className="font-bold text-brand-dark">{contact.displayName ?? contact.email}</h3>
              <p className="mb-3 break-all text-xs text-text-secondary">{contact.email}</p>
              <PlatformAdminEmailForm
                targetType="USER"
                targetId={contact.id}
                returnTo={`/platformbeheer/${permission === 'REVIEWER' ? 'reviewer' : 'approver'}`}
                label={`${title} mailen`}
              />
            </section>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Open dossiers">
        <ul className="grid gap-2">
          {data.dossiers.map((dossier) => (
            <li className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-surface px-4 py-3" key={dossier.id}>
              <span><strong>{dossier.providerProfile.organization.name}</strong> · {presentProviderReviewStatus(dossier.status)}</span>
              <Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/dienstverleners/${dossier.providerProfile.id}`}>Open dossier</Link>
            </li>
          ))}
        </ul>
        <Link className="mt-3 inline-flex font-semibold text-brand-primary underline" href="/platformbeheer/auditor">Audit bekijken</Link>
      </AdminSection>
    </>
  )
}
