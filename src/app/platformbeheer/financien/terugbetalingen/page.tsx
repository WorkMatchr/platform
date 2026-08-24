import Link from 'next/link'
import { FinancialPaymentStatus } from '@/generated/prisma/client'
import { AdminPageHeader, AdminPagination, AdminSection, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { formatEuro } from '@/lib/finance/financial-contract'
import { formatPlatformDate, paginationHref, parseDateBoundary, parsePage, singleParam, type FinancialSearchParams } from '@/lib/finance/platform-financial-filters'
import { financialPaymentStatusLabels, financialStatusTone } from '@/lib/finance/platform-financial-presentation'
import { listPlatformFinancialRefunds } from '@/lib/finance/platform-financial-query-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

const pathname = '/platformbeheer/financien/terugbetalingen'

export default async function PlatformFinancialRefundsPage({ searchParams }: { searchParams: Promise<FinancialSearchParams> }) {
  const administrator = await requirePlatformAdministrator(pathname)
  const params = await searchParams
  const statusValue = singleParam(params, 'status')
  const status = Object.values(FinancialPaymentStatus).includes(statusValue as FinancialPaymentStatus) ? statusValue as FinancialPaymentStatus : undefined
  const organization = singleParam(params, 'organization')?.trim()
  const from = singleParam(params, 'from')
  const through = singleParam(params, 'through')
  const data = await listPlatformFinancialRefunds(administrator.id, { page: parsePage(singleParam(params, 'page')), status, organization, from: parseDateBoundary(from), through: parseDateBoundary(through, true) })

  return <>
    <AdminPageHeader title="Terugbetalingen" description="Read-only overzicht van terugbetalingen en de gekoppelde aankoop- en factuurhistorie." />
    <FilterForm>
      <FilterField name="status" label="Status"><select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" name="status" defaultValue={statusValue ?? ''}><option value="">Alle statussen</option>{Object.values(FinancialPaymentStatus).map((item) => <option key={item} value={item}>{financialPaymentStatusLabels[item]}</option>)}</select></FilterField>
      <FilterField name="organization" label="Organisatie" defaultValue={organization} />
      <FilterField name="from" label="Vanaf"><input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" type="date" name="from" defaultValue={from} /></FilterField>
      <FilterField name="through" label="Tot en met"><input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" type="date" name="through" defaultValue={through} /></FilterField>
    </FilterForm>
    <AdminSection title={`${data.total} terugbetalingen`}>
      {data.items.length === 0 ? <EmptyState>Geen terugbetalingen gevonden met deze filters.</EmptyState> : <AdminTable headers={['Datum', 'Organisatie', 'Status', 'Bedrag', 'Oorspronkelijke betaling', 'Oorspronkelijke factuur', 'Creditnota']}>
        {data.items.map((refund) => <tr key={refund.id}>
          <td className="whitespace-nowrap px-4 py-3">{formatPlatformDate(refund.completedAt ?? refund.requestedAt)}</td>
          <td className="px-4 py-3 font-medium text-brand-dark">{refund.purchase.organization.name}</td>
          <td className="px-4 py-3"><StatusPill tone={financialStatusTone(refund.status)}>{financialPaymentStatusLabels[refund.status]}</StatusPill></td>
          <td className="whitespace-nowrap px-4 py-3">{formatEuro(refund.amountCents)}</td>
          <td className="px-4 py-3 font-mono text-xs">{refund.purchase.molliePaymentId ?? '—'}</td>
          <td className="px-4 py-3">{refund.purchase.invoice ? <Link className="font-semibold text-brand-primary hover:underline" href={`/platformbeheer/financien/facturen/${refund.purchase.invoice.id}/pdf`}>{refund.purchase.invoice.invoiceNumber}</Link> : '—'}</td>
          <td className="px-4 py-3">{refund.creditNote ? <Link className="font-semibold text-brand-primary hover:underline" href={`/platformbeheer/financien/facturen/${refund.creditNote.id}/pdf`}>{refund.creditNote.invoiceNumber}</Link> : '—'}</td>
        </tr>)}
      </AdminTable>}
      <AdminPagination page={data.page} pageCount={data.pageCount} previousHref={data.page > 1 ? paginationHref(pathname, params, data.page - 1) : null} nextHref={data.page < data.pageCount ? paginationHref(pathname, params, data.page + 1) : null} />
    </AdminSection>
  </>
}
