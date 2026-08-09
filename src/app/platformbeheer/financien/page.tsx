import { AdminPageHeader, AdminSection, AdminTable, MetricCard } from '@/components/platform-admin/platform-admin-ui'
import { formatEuro } from '@/lib/finance/financial-contract'
import { getPlatformFinancialDashboard } from '@/lib/finance/financial-dashboard-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export default async function PlatformFinancialPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/financien')
  const data = await getPlatformFinancialDashboard(administrator.id)
  return <>
    <AdminPageHeader title="Financieel" description="Herleidbaar overzicht uit betalingen, facturen, abonnementen en het append-only creditgrootboek." />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <MetricCard label="Bruto omzet incl. btw" value={formatEuro(data.grossRevenueInclVatCents)} />
      <MetricCard label="Terugbetaald incl. btw" value={formatEuro(data.refundInclVatCents)} attention={data.refundInclVatCents > 0} />
      <MetricCard label="Netto omzet incl. btw" value={formatEuro(data.netRevenueInclVatCents)} />
      <MetricCard label="Netto omzet excl. btw" value={formatEuro(data.netRevenueExclVatCents)} />
      <MetricCard label="Netto btw" value={formatEuro(data.netVatCents)} />
      <MetricCard label="Creditbetalingen" value={data.successfulCreditPayments} />
      <MetricCard label="Eerste Pro-betalingen" value={data.successfulInitialProPayments} />
      <MetricCard label="Terugkerende Pro-betalingen" value={data.successfulRecurringProPayments} />
      <MetricCard label="Mislukte creditbetalingen" value={data.failedCreditPayments} attention={data.failedCreditPayments > 0} />
      <MetricCard label="Mislukte Pro-betalingen" value={data.failedProPayments} attention={data.failedProPayments > 0} />
      <MetricCard label="Terugbetalingen voltooid" value={data.refunds} />
      <MetricCard label="Terugbetalingen in behandeling" value={data.pendingRefunds} attention={data.pendingRefunds > 0} />
      <MetricCard label="Terugbetalingen mislukt" value={data.failedRefunds} attention={data.failedRefunds > 0} />
      <MetricCard label="Verkochte credits" value={data.soldCredits} />
      <MetricCard label="Bonuscredits" value={data.bonusCredits} />
      <MetricCard label="Gebruikte credits" value={data.usedCredits} />
      <MetricCard label="Kortingscodes gebruikt" value={data.discountCodeUses} />
      <MetricCard label="Startersbonussen" value={data.starterBonuses} />
    </div>
    <AdminSection title="WorkMatchr Pro" description="Actuele abonnementstatussen; Pro beïnvloedt matching niet.">
      <AdminTable headers={['Status', 'Aantal']}>{data.subscriptions.map((item) => <tr key={item.status}><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable>
    </AdminSection>
    <AdminSection title="Jortt-synchronisatie" description="Een storing in Jortt verandert nooit betaling, factuur of credits.">
      <AdminTable headers={['Status', 'Aantal']}>{data.jortt.map((item) => <tr key={item.status}><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable>
    </AdminSection>
  </>
}
