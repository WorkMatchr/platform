import { AdminPageHeader, AdminSection, AdminTable, MetricCard } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformMarketplaceOverview } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformMarketplacePage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/marketplace')
  const data = await getPlatformMarketplaceOverview(administrator.id)
  const byStatus = (items: Array<{ status: string; _count: number }>, status: string) => items.find((item) => item.status === status)?._count ?? 0
  return (
    <>
      <AdminPageHeader title="Marketplace" description="Operationeel inzicht in credits, uitnodigingen en offertes. Dit is geen financiële administratie." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Creditaccounts" value={data.credits._count} />
        <MetricCard label="Beschikbare credits" value={data.credits._sum.availableBalance ?? 0} />
        <MetricCard label="Actieve reserveringen" value={byStatus(data.reservations, 'ACTIVE')} />
        <MetricCard label="Mislukte outboxitems" value={data.failedOutbox} attention={data.failedOutbox > 0} />
        <MetricCard label="Uitnodigingen verzonden" value={byStatus(data.invitations, 'SENT')} />
        <MetricCard label="Uitnodigingen geaccepteerd" value={byStatus(data.invitations, 'ACCEPTED')} />
        <MetricCard label="Offertes ingediend" value={byStatus(data.quotes, 'SUBMITTED')} />
        <MetricCard label="Gunningen" value={data.awards} />
      </div>
      <AdminSection title="Recente creditmutaties" description="Alleen inzicht; mutaties lopen via de bestaande creditservices.">
        <AdminTable headers={['Organisatie', 'Type', 'Aantal', 'Reden', 'Datum']}>
          {data.recentTransactions.map((transaction) => <tr key={transaction.id}>
            <td className="px-4 py-3">{transaction.creditAccount.organization.name}</td>
            <td className="px-4 py-3">{transaction.type}</td>
            <td className="px-4 py-3">{transaction.amount}</td>
            <td className="px-4 py-3">{transaction.reason}</td>
            <td className="px-4 py-3">{transaction.createdAt.toLocaleString('nl-NL')}</td>
          </tr>)}
        </AdminTable>
      </AdminSection>
    </>
  )
}
