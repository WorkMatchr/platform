import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { startPlatformFinancialRefundAction } from '@/app/platformbeheer/financien/actions'
import { AdminPageHeader, AdminSection, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { formatEuro } from '@/lib/finance/financial-contract'
import { financialPaymentStatusLabels, financialPurchaseKindLabels, financialPurchaseStatusLabels, financialStatusTone } from '@/lib/finance/platform-financial-presentation'
import { getPlatformFinancialPaymentDetail } from '@/lib/finance/platform-financial-query-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

const reasonLabels = {
  DUPLICATE_CHARGE: 'Dubbele betaling',
  CREDITS_NOT_DELIVERED: 'Credits niet geleverd',
  WORKMATCHR_TECHNICAL_ERROR: 'Technische fout van WorkMatchr',
  OTHER_APPROVED_WORKMATCHR_ERROR: 'Andere goedgekeurde fout van WorkMatchr',
} as const

export default async function PlatformFinancialPaymentDetailPage({ params, searchParams }: { params: Promise<{ purchaseId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { purchaseId } = await params
  const pathname = `/platformbeheer/financien/betalingen/${purchaseId}`
  const administrator = await requirePlatformAdministrator(pathname)
  const [purchase, query] = await Promise.all([
    getPlatformFinancialPaymentDetail(administrator.id, purchaseId),
    searchParams,
  ])
  if (!purchase) notFound()
  const canRefund = purchase.kind === 'CREDIT_PACKAGE' && purchase.status === 'PAID' && Boolean(purchase.molliePaymentId) && Boolean(purchase.creditedTransaction) && purchase.refunds.length === 0

  return (
    <>
      <AdminPageHeader
        title="Betaling"
        description="Controleer de betaalde aankoop en start alleen bij een goedgekeurde WorkMatchr-fout een volledige terugbetaling."
        action={<StatusPill tone={financialStatusTone(purchase.status)}>{financialPurchaseStatusLabels[purchase.status]}</StatusPill>}
      />
      <Link className="mb-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand-primary hover:underline" href="/platformbeheer/financien/betalingen">Terug naar betalingen</Link>
      {query.resultaat === 'terugbetaling-gestart' ? <p className="mb-4 rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De terugbetaling is veilig gestart. De definitieve providerstatus wordt in het terugbetalingenoverzicht gevolgd.</p> : null}
      {query.resultaat === 'controle-nodig' ? <p className="mb-4 rounded-control border border-warning-border bg-warning-subtle px-4 py-3 text-sm">De credits zijn na deze aankoop gebruikt. De aankoop is gemarkeerd voor handmatige controle; er is nog geen Mollie-terugbetaling gestart.</p> : null}
      {query.fout ? <p className="mb-4 rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De terugbetaling is niet gestart. Er zijn geen onvolledige wijzigingen doorgevoerd. Controleer de aankoop en probeer het zo nodig opnieuw.</p> : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection title="Aankoopgegevens">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-text-secondary">Organisatie</dt><dd className="font-semibold text-brand-dark">{purchase.organization.name}</dd></div>
            <div><dt className="text-text-secondary">Type</dt><dd>{financialPurchaseKindLabels[purchase.kind]}</dd></div>
            <div><dt className="text-text-secondary">Omschrijving</dt><dd>{purchase.packageLabel}</dd></div>
            <div><dt className="text-text-secondary">Credits</dt><dd>{purchase.credits}</dd></div>
            <div><dt className="text-text-secondary">Bedrag excl. btw</dt><dd>{formatEuro(purchase.amountExclVatCents)}</dd></div>
            <div><dt className="text-text-secondary">Btw ({purchase.vatRateBps / 100}%)</dt><dd>{formatEuro(purchase.vatAmountCents)}</dd></div>
            <div><dt className="text-text-secondary">Betaald incl. btw</dt><dd className="font-semibold">{formatEuro(purchase.amountInclVatCents)}</dd></div>
            <div><dt className="text-text-secondary">Factuur</dt><dd>{purchase.invoice ? <Link className="font-semibold text-brand-primary hover:underline" href={`/platformbeheer/financien/facturen/${purchase.invoice.id}/pdf`}>{purchase.invoice.invoiceNumber}</Link> : 'Niet beschikbaar'}</dd></div>
          </dl>
        </AdminSection>
        <AdminSection title="Gevolgen voor credits">
          <p className="text-sm text-text-secondary">
            Een volledige terugbetaling corrigeert {purchase.credits} credits via het append-only creditgrootboek. {purchase.creditsUsedAfterPurchase
              ? 'Na deze aankoop zijn credits gebruikt. Daarom volgt eerst handmatige controle en wordt Mollie nog niet aangeroepen.'
              : 'Er is geen later creditgebruik gevonden; bij bevestiging worden de credits gereserveerd totdat Mollie de terugbetaling definitief bevestigt.'}
          </p>
          {purchase.creditedTransaction ? <dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-text-secondary">Beschikbaar</dt><dd className="font-semibold">{purchase.creditedTransaction.creditAccount.availableBalance}</dd></div><div><dt className="text-text-secondary">Gereserveerd</dt><dd className="font-semibold">{purchase.creditedTransaction.creditAccount.reservedBalance}</dd></div><div><dt className="text-text-secondary">Besteed</dt><dd className="font-semibold">{purchase.creditedTransaction.creditAccount.spentBalance}</dd></div></dl> : null}
        </AdminSection>
      </div>
      {purchase.refunds.length > 0 ? (
        <AdminSection title="Bestaande terugbetaling" description="Voor deze aankoop kan geen tweede terugbetaling worden gestart.">
          {purchase.refunds.map((refund) => <div className="flex flex-wrap items-center gap-3" key={refund.id}><StatusPill tone={financialStatusTone(refund.status)}>{financialPaymentStatusLabels[refund.status]}</StatusPill><Link className="font-semibold text-brand-primary hover:underline" href="/platformbeheer/financien/terugbetalingen">Bekijk terugbetalingen</Link></div>)}
        </AdminSection>
      ) : canRefund ? (
        <AdminSection title="Volledige terugbetaling starten" description="Deze financiële actie is onomkeerbaar zodra Mollie haar definitief verwerkt.">
          <form action={startPlatformFinancialRefundAction} className="grid max-w-2xl gap-4">
            <input type="hidden" name="purchaseId" value={purchase.id} />
            <input type="hidden" name="idempotencyKey" value={`platform-refund:${purchase.id}:${randomUUID()}`} />
            <label className="grid gap-1 text-sm font-semibold">Reden terugbetaling
              <select className="min-h-11 rounded-control border border-border bg-surface px-3 font-normal" name="reasonCode" required>
                <option value="">Kies een reden</option>
                {Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Toelichting
              <textarea className="min-h-28 rounded-control border border-border bg-surface px-3 py-2 font-normal" name="reason" minLength={10} maxLength={500} required />
            </label>
            <label className="flex items-start gap-3 rounded-control border border-warning-border bg-warning-subtle p-3 text-sm">
              <input className="mt-1 size-4" type="checkbox" name="confirmed" required />
              <span>Ik bevestig dat WorkMatchr deze volledige terugbetaling heeft goedgekeurd en dat ik de gevolgen voor betaling, credits en creditnota heb gecontroleerd.</span>
            </label>
            <button className="min-h-11 justify-self-start rounded-control bg-danger px-5 font-semibold text-white hover:opacity-90" type="submit">Volledig terugbetalen</button>
          </form>
        </AdminSection>
      ) : (
        <AdminSection title="Terugbetaling niet beschikbaar">
          <p className="text-sm text-text-secondary">Alleen een betaalde creditaankoop met geleverde credits kan via deze beheerflow volledig worden terugbetaald.</p>
        </AdminSection>
      )}
    </>
  )
}
