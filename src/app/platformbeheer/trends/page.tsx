import { AdminPageHeader, AdminSection, AdminTable, EmptyState } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformTrends } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformTrendsPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/trends')
  const data = await getPlatformTrends(administrator.id)
  return (
    <>
      <AdminPageHeader title="Zoekgedrag & Trends" description="Uitsluitend geaggregeerde platformgegevens; geen persoonsgegevens of volledige zoekgeschiedenis." />
      {!data.searchTelemetryAvailable ? (
        <EmptyState>Zoektermen worden nog niet gemeten. WorkMatchr activeert geen verborgen tracking zonder vastgesteld privacy-, cookie- en retentiebeleid. De beschikbare trends hieronder komen uit platformregistraties en opdrachten.</EmptyState>
      ) : null}
      <AdminSection title="Ontwikkeling per maand">
        <AdminTable headers={['Maand', 'Registraties', 'Opdrachten']}>{data.months.map((month) => <tr key={month.label}><td className="px-4 py-3 font-semibold">{month.label}</td><td className="px-4 py-3">{month.registrations}</td><td className="px-4 py-3">{month.assignments}</td></tr>)}</AdminTable>
      </AdminSection>
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Populaire sectoren"><AdminTable headers={['Sector', 'Opdrachten']}>{data.sectors.map((item) => <tr key={item.label}><td className="px-4 py-3">{item.label}</td><td className="px-4 py-3">{item.count}</td></tr>)}</AdminTable></AdminSection>
        <AdminSection title="Spreiding per regio"><AdminTable headers={['Regio', 'Locaties']}>{data.regions.map((item) => <tr key={item.label ?? 'onbekend'}><td className="px-4 py-3">{item.label ?? 'Niet vastgelegd'}</td><td className="px-4 py-3">{item.count}</td></tr>)}</AdminTable></AdminSection>
      </div>
    </>
  )
}
