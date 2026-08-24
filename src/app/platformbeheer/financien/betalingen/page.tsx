import Link from 'next/link'
import { FinancialPurchaseKind, FinancialPurchaseStatus } from '@/generated/prisma/client'
import { AdminPageHeader, AdminPagination, AdminSection, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { formatEuro } from '@/lib/finance/financial-contract'
import { formatPlatformDate, paginationHref, parseDateBoundary, parsePage, singleParam, type FinancialSearchParams } from '@/lib/finance/platform-financial-filters'
import { financialPurchaseKindLabels, financialPurchaseStatusLabels, financialStatusTone } from '@/lib/finance/platform-financial-presentation'
import { listPlatformFinancialPayments } from '@/lib/finance/platform-financial-query-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

const pathname = '/platformbeheer/financien/betalingen'

function enumValue<T extends string>(value: string | undefined, values: readonly T[]) {
  return value && values.includes(value as T) ? value as T : undefined
}

export default async function PlatformFinancialPaymentsPage({ searchParams }: { searchParams: Promise<FinancialSearchParams> }) {
  const administrator = await requirePlatformAdministrator(pathname)
  const params = await searchParams
  const statusValue = singleParam(params, 'status')
  const kindValue = singleParam(params, 'kind')
  const organization = singleParam(params, 'organization')?.trim()
  const from = singleParam(params, 'from')
  const through = singleParam(params, 'through')
  const data = await listPlatformFinancialPayments(administrator.id, {
    page: parsePage(singleParam(params, 'page')),
    status: enumValue(statusValue, Object.values(FinancialPurchaseStatus)),
    kind: enumValue(kindValue, Object.values(FinancialPurchaseKind)),
    organization,
    from: parseDateBoundary(from),
    through: parseDateBoundary(through, true),
  })

  return <>
    <AdminPageHeader title="Betalingen" description="Read-only overzicht van individuele creditaankopen en eerste Pro-betalingen." />
    <FilterForm>
      <FilterField name="status" label="Status"><select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" name="status" defaultValue={statusValue ?? ''}><option value="">Alle statussen</option>{Object.values(FinancialPurchaseStatus).map((status) => <option key={status} value={status}>{financialPurchaseStatusLabels[status]}</option>)}</select></FilterField>
      <FilterField name="kind" label="Type"><select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" name="kind" defaultValue={kindValue ?? ''}><option value="">Credits en Pro</option>{Object.values(FinancialPurchaseKind).map((kind) => <option key={kind} value={kind}>{financialPurchaseKindLabels[kind]}</option>)}</select></FilterField>
      <FilterField name="organization" label="Organisatie" defaultValue={organization} />
      <FilterField name="from" label="Vanaf"><input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" type="date" name="from" defaultValue={from} /></FilterField>
      <FilterField name="through" label="Tot en met"><input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" type="date" name="through" defaultValue={through} /></FilterField>
    </FilterForm>
    <AdminSection title={`${data.total} betalingen`} description="Mollie-identificatie wordt alleen binnen beveiligd platformbeheer getoond.">
      {data.items.length === 0 ? <EmptyState>Geen betalingen gevonden met deze filters.</EmptyState> : <AdminTable headers={['Datum', 'Organisatie / klant', 'Type', 'Mollie payment-id', 'Incl. btw', 'Status', 'Factuur']}>
        {data.items.map((payment) => <tr key={payment.id}>
          <td className="whitespace-nowrap px-4 py-3">{formatPlatformDate(payment.createdAt)}</td>
          <td className="px-4 py-3 font-medium text-brand-dark">{payment.organization.name}</td>
          <td className="px-4 py-3">{financialPurchaseKindLabels[payment.kind]}</td>
          <td className="px-4 py-3 font-mono text-xs">{payment.molliePaymentId ?? '—'}</td>
          <td className="whitespace-nowrap px-4 py-3">{formatEuro(payment.amountInclVatCents)}</td>
          <td className="px-4 py-3"><StatusPill tone={financialStatusTone(payment.status)}>{financialPurchaseStatusLabels[payment.status]}</StatusPill></td>
          <td className="px-4 py-3">{payment.invoice ? <Link className="font-semibold text-brand-primary hover:underline" href={`/platformbeheer/financien/facturen/${payment.invoice.id}/pdf`}>{payment.invoice.invoiceNumber}</Link> : '—'}</td>
        </tr>)}
      </AdminTable>}
      <AdminPagination page={data.page} pageCount={data.pageCount} previousHref={data.page > 1 ? paginationHref(pathname, params, data.page - 1) : null} nextHref={data.page < data.pageCount ? paginationHref(pathname, params, data.page + 1) : null} />
    </AdminSection>
  </>
}
