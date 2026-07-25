import Link from 'next/link'
import { AdminPageHeader, AdminSection, AdminTable, MetricCard } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformReportData } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformReportsPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/rapportages')
  const report = await getPlatformReportData(administrator.id)
  return (
    <>
      <AdminPageHeader
        title="Rapportages"
        description="Een eerste, reproduceerbare rapportage over groei, opdrachten, dienstverleners en marketplaceconversie."
        action={<Link className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-brand-dark" href="/platformbeheer/rapportages/export">Exporteer CSV</Link>}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Organisaties" value={report.dashboard.platform.organizations} />
        <MetricCard label="Actieve gebruikers" value={report.dashboard.platform.activeUsers} />
        <MetricCard label="Dienstverleners" value={report.dashboard.providers.total} />
        <MetricCard label="Gunningen" value={report.marketplace.awards} />
      </div>
      <AdminSection title="Groei per maand">
        <AdminTable headers={['Maand', 'Registraties', 'Opdrachten']}>{report.trends.months.map((month) => <tr key={month.label}><td className="px-4 py-3">{month.label}</td><td className="px-4 py-3">{month.registrations}</td><td className="px-4 py-3">{month.assignments}</td></tr>)}</AdminTable>
      </AdminSection>
    </>
  )
}
