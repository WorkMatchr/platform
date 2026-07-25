import Link from 'next/link'
import { AdminPageHeader, AdminSection, MetricCard, StatusPill } from './platform-admin-ui'

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
    </>
  )
}
