import Link from 'next/link'
import { FinancialDocumentType } from '@/generated/prisma/client'
import { AdminPageHeader, AdminPagination, AdminSection, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { formatEuro } from '@/lib/finance/financial-contract'
import { formatPlatformDate, paginationHref, parseDateBoundary, parsePage, singleParam, type FinancialSearchParams } from '@/lib/finance/platform-financial-filters'
import { financialDocumentTypeLabels, financialPaymentStatusLabels, financialPurchaseStatusLabels, financialStatusTone } from '@/lib/finance/platform-financial-presentation'
import { listPlatformFinancialInvoices } from '@/lib/finance/platform-financial-query-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

const pathname = '/platformbeheer/financien/facturen'

export default async function PlatformFinancialInvoicesPage({ searchParams }: { searchParams: Promise<FinancialSearchParams> }) {
  const administrator = await requirePlatformAdministrator(pathname)
  const params = await searchParams
  const documentTypeValue = singleParam(params, 'documentType')
  const documentType = Object.values(FinancialDocumentType).includes(documentTypeValue as FinancialDocumentType) ? documentTypeValue as FinancialDocumentType : undefined
  const organization = singleParam(params, 'organization')?.trim()
  const from = singleParam(params, 'from')
  const through = singleParam(params, 'through')
  const data = await listPlatformFinancialInvoices(administrator.id, { page: parsePage(singleParam(params, 'page')), documentType, organization, from: parseDateBoundary(from), through: parseDateBoundary(through, true) })

  return <>
    <AdminPageHeader title="Facturen" description="Immutable factuursnapshots en creditnota’s met beveiligde PDF-download." />
    <FilterForm>
      <FilterField name="documentType" label="Documenttype"><select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" name="documentType" defaultValue={documentTypeValue ?? ''}><option value="">Alle documenten</option>{Object.values(FinancialDocumentType).map((type) => <option key={type} value={type}>{financialDocumentTypeLabels[type]}</option>)}</select></FilterField>
      <FilterField name="organization" label="Organisatie" defaultValue={organization} />
      <FilterField name="from" label="Vanaf"><input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" type="date" name="from" defaultValue={from} /></FilterField>
      <FilterField name="through" label="Tot en met"><input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" type="date" name="through" defaultValue={through} /></FilterField>
    </FilterForm>
    <AdminSection title={`${data.total} factuurdocumenten`}>
      {data.items.length === 0 ? <EmptyState>Geen facturen gevonden met deze filters.</EmptyState> : <AdminTable headers={['Factuurnummer', 'Datum', 'Organisatie', 'Excl. btw', 'Btw', 'Totaal', 'Betaalstatus', 'PDF']}>
        {data.items.map((invoice) => {
          const status = invoice.purchase?.status ?? invoice.subscriptionPayment?.status ?? invoice.refund?.status
          const statusLabel = invoice.purchase
            ? financialPurchaseStatusLabels[invoice.purchase.status]
            : invoice.subscriptionPayment
              ? financialPaymentStatusLabels[invoice.subscriptionPayment.status]
              : invoice.refund
                ? financialPaymentStatusLabels[invoice.refund.status]
                : 'Niet beschikbaar'
          return <tr key={invoice.id}>
            <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-dark">{invoice.invoiceNumber}</td>
            <td className="whitespace-nowrap px-4 py-3">{formatPlatformDate(invoice.issuedAt)}</td>
            <td className="px-4 py-3">{invoice.organization.name}</td>
            <td className="whitespace-nowrap px-4 py-3">{formatEuro(invoice.amountExclVatCents)}</td>
            <td className="whitespace-nowrap px-4 py-3">{formatEuro(invoice.vatAmountCents)}</td>
            <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatEuro(invoice.amountInclVatCents)}</td>
            <td className="px-4 py-3">{status ? <StatusPill tone={financialStatusTone(status)}>{statusLabel}</StatusPill> : statusLabel}</td>
            <td className="px-4 py-3"><Link className="font-semibold text-brand-primary hover:underline" href={`${pathname}/${invoice.id}/pdf`}>Bekijken / downloaden</Link></td>
          </tr>
        })}
      </AdminTable>}
      <AdminPagination page={data.page} pageCount={data.pageCount} previousHref={data.page > 1 ? paginationHref(pathname, params, data.page - 1) : null} nextHref={data.page < data.pageCount ? paginationHref(pathname, params, data.page + 1) : null} />
    </AdminSection>
  </>
}
