import { AdminPageHeader, AdminSection, AdminTable, EmptyState } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAuditor } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAuditorOverview } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformAuditorPage() {
  const auditor = await requirePlatformAuditor('/platformbeheer/auditor')
  const data = await getPlatformAuditorOverview(auditor.id)
  const statusCards = [
    ['Accountgebeurtenissen', data.eventCounts.accounts],
    ['Lidmaatschapsgebeurtenissen', data.eventCounts.memberships],
    ['Organisatiegebeurtenissen', data.eventCounts.organizations],
    ['Marketplacegebeurtenissen', data.eventCounts.marketplace],
  ]

  return (
    <>
      <AdminPageHeader title="Audit" description="Read-only overzicht van controleerbare systeemgebeurtenissen. Persoons- en inhoudsgegevens zijn hierbij weggelaten." />
      <AdminSection title="Auditstatus">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statusCards.map(([label, count]) => (
            <div className="rounded-control border border-border bg-surface-subtle p-4" key={label}>
              <dt className="text-sm text-text-secondary">{label}</dt>
              <dd className="mt-1 text-2xl font-bold text-brand-dark">{count}</dd>
            </div>
          ))}
        </dl>
      </AdminSection>
      <AdminSection title="Recente auditgebeurtenissen">
        {data.events.length === 0 ? <EmptyState>Geen auditgebeurtenissen gevonden.</EmptyState> : (
          <AdminTable headers={['Bron', 'Gebeurtenis', 'Moment']}>
            {data.events.map((event, index) => (
              <tr key={`${event.source}-${event.action}-${event.at.toISOString()}-${index}`}>
                <td className="px-4 py-3">{event.source}</td>
                <td className="px-4 py-3 font-semibold">{event.action}</td>
                <td className="px-4 py-3">{event.at.toLocaleString('nl-NL')}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminSection>
    </>
  )
}
