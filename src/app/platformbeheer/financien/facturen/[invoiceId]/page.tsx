import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { AdminPageHeader, AdminSection } from '@/components/platform-admin/platform-admin-ui'
import { Button } from '@/components/ui/button'
import { formatEuro } from '@/lib/finance/financial-contract'
import { financialPaymentStatusLabels } from '@/lib/finance/platform-financial-presentation'
import { proFinancialCorrectionAction } from '../../actions'

const field = 'block min-h-11 w-full rounded-control border border-border bg-surface p-3'
function Confirmation({ invoiceId, operation }: { invoiceId: string; operation: string }) {
  return <><input type="hidden" name="invoiceId" value={invoiceId} /><input type="hidden" name="operation" value={operation} />
    <input type="hidden" name="idempotencyKey" value={`pro-admin:${randomUUID()}`} />
    <label className="block">Onderbouwing<textarea className={field} name="reason" minLength={10} maxLength={500} required /></label>
    <label className="flex items-start gap-3"><input type="checkbox" name="confirmed" required className="mt-1" />Ik heb de factuur, het bedrag en de gevolgen gecontroleerd en ben bevoegd deze handeling uit te voeren.</label></>
}
export default async function InvoicePage({ params, searchParams }: { params: Promise<{ invoiceId: string }>; searchParams: Promise<{ fout?: string; resultaat?: string }> }) {
  await requirePlatformAdministrator('/platformbeheer/financien/facturen')
  const { invoiceId } = await params
  if (!z.string().uuid().safeParse(invoiceId).success) notFound()
  const invoice = await getPrisma().financialInvoice.findUnique({ where: { id: invoiceId }, include: {
    purchase: true, subscriptionPayment: true, originalInvoice: true, corrections: true, proRefund: true, jorttSync: true,
    events: { orderBy: { createdAt: 'desc' }, take: 20 },
  } })
  if (!invoice) notFound()
  const pro = invoice.credits === 0 && (invoice.purchase?.kind === 'PRO_SUBSCRIPTION' || !!invoice.subscriptionPayment)
  const remaining = invoice.amountInclVatCents + invoice.corrections.reduce((sum, c) => sum + c.amountInclVatCents, 0)
  const enabled = process.env.PRO_FINANCIAL_CORRECTIONS_ENABLED === 'true'
  const paymentConfirmation = await getPrisma().financialEvent.findUnique({ where: { idempotencyKey: `jortt-payment-confirmed:${invoice.id}` }, select: { createdAt: true } })
  const feedback = await searchParams
  return <><AdminPageHeader title={invoice.invoiceNumber} description="Factuur, creditfacturen, terugbetaling en administratieve betaalregistratie." />
    {feedback.fout || feedback.resultaat === 'controle-nodig' ? <p role="alert">De verwerking vereist controle. Controleer de registratie en providerstatus voordat u een nieuwe handeling uitvoert.</p> : feedback.resultaat ? <p role="status">De handeling is vastgelegd.</p> : null}
    <AdminSection title="Factuurgegevens"><p>{invoice.customerOrganizationName} — {formatEuro(invoice.amountExclVatCents)} excl. btw + {formatEuro(invoice.vatAmountCents)} btw = {formatEuro(invoice.amountInclVatCents)} incl. btw.</p>
      {invoice.servicePeriodStart && invoice.servicePeriodEnd ? <p>Abonnementsperiode: {invoice.servicePeriodStart.toLocaleDateString('nl-NL')} tot {invoice.servicePeriodEnd.toLocaleDateString('nl-NL')}.</p> : null}
      <Link className="underline" href={`/platformbeheer/financien/facturen/${invoice.id}/pdf`}>PDF bekijken</Link>
      {invoice.originalInvoice ? <p>Oorspronkelijke factuur: <Link className="underline" href={`/platformbeheer/financien/facturen/${invoice.originalInvoice.id}`}>{invoice.originalInvoice.invoiceNumber}</Link></p> : null}
      {invoice.corrections.map(c => <p key={c.id}><Link className="underline" href={`/platformbeheer/financien/facturen/${c.id}`}>{c.invoiceNumber}</Link>: {formatEuro(c.amountInclVatCents)} incl. btw</p>)}
    </AdminSection>
    <p>Een creditfactuur corrigeert de facturatie. Geld terugbetalen en het abonnement beëindigen zijn afzonderlijke handelingen. Deze correcties stoppen geen toekomstige incasso’s.</p>
    {!enabled ? <p>Financiële correcties zijn nog niet vrijgegeven.</p> : null}
    {pro && remaining > 0 ? <AdminSection title="Pro-factuur geheel of gedeeltelijk crediteren"><p>Nog te crediteren: {formatEuro(remaining)} incl. btw. De btw wordt berekend vanuit de oorspronkelijke factuur.</p>
      <form action={proFinancialCorrectionAction} className="max-w-xl space-y-4"><fieldset disabled={!enabled} className="space-y-4">
        <label className="block">Creditbedrag inclusief btw (bijvoorbeeld 10,00)<input className={field} name="amount" inputMode="decimal" required pattern="[0-9]+[.,][0-9]{2}" defaultValue={(remaining / 100).toFixed(2).replace('.', ',')} /></label>
        <Confirmation invoiceId={invoice.id} operation="credit" /><Button type="submit">Creditfactuur aanmaken</Button>
      </fieldset></form></AdminSection> : null}
    {pro ? <AdminSection title="Eén ontvangen Pro-betaling verwerken">
      <p>Gebruik uitsluitend de afzonderlijk goedgekeurde Mollie-betaling. Een ontbrekende registratie en factuur worden aangemaakt. Er wordt geen nieuwe incasso gestart. Verwerking in Jortt blijft een afzonderlijke stap.</p>
      <form action={proFinancialCorrectionAction} className="max-w-xl space-y-4"><fieldset disabled={!enabled} className="space-y-4">
        <label className="block">Goedgekeurd Mollie-betalings-ID<input className={field} name="paymentId" required pattern="tr_[A-Za-z0-9]+" maxLength={100} /></label>
        <Confirmation invoiceId={invoice.id} operation="pro-payments" /><Button type="submit">Deze betaling verwerken</Button>
      </fieldset></form>
    </AdminSection> : null}
    {pro ? <AdminSection title="Ontbrekende incasso's controleren"><p>Controleer alle providerbetalingen vanaf de gekozen datum. Bestaande registraties blijven behouden; geldige ontbrekende betalingen krijgen een factuur. Deze brede actie vereist goedkeuring voor de volledige periode; gebruik haar niet voor herstel van één afzonderlijk goedgekeurde betaling.</p>
      <form action={proFinancialCorrectionAction} className="max-w-xl space-y-4"><fieldset disabled={!enabled} className="space-y-4">
        <label className="block">Controleren vanaf<input className={field} type="date" name="after" required /></label>
        <Confirmation invoiceId={invoice.id} operation="pro-payments" /><Button type="submit">Pro-betalingen reconciliëren</Button>
      </fieldset></form></AdminSection> : null}
    {invoice.proCreditKey ? <AdminSection title="Afzonderlijke geldterugbetaling">
      <p>Bedrag: {formatEuro(-invoice.amountInclVatCents)}. {invoice.proRefund ? `Status: ${financialPaymentStatusLabels[invoice.proRefund.status]}.` : 'Er is nog geen terugbetaling aangevraagd.'}</p>
      {invoice.proRefund?.reconciliationRequired ? <p role="status">Provideracceptatie onzeker. Alleen de status controleren; geen nieuwe refund starten.</p> : null}
      {!invoice.proRefund || invoice.proRefund.status === 'PENDING' ? <form action={proFinancialCorrectionAction} className="max-w-xl space-y-4"><fieldset disabled={!enabled} className="space-y-4">
        <Confirmation invoiceId={invoice.id} operation={invoice.proRefund?.providerAttemptedAt || invoice.proRefund?.providerDispatchVersion === 0 ? 'refund-check' : 'refund'} /><Button type="submit">{invoice.proRefund?.providerAttemptedAt || invoice.proRefund?.providerDispatchVersion === 0 ? 'Providerstatus controleren' : 'Geld terugbetalen via Mollie'}</Button>
      </fieldset></form> : null}
    </AdminSection> : null}
    {invoice.documentType === 'INVOICE' && invoice.jorttSync?.status === 'SYNCED' ? <AdminSection title="Jortt-betaalreconciliatie"><p>{paymentConfirmation ? `Betaalregistratie gecontroleerd op ${paymentConfirmation.createdAt.toLocaleDateString('nl-NL')}.` : 'Betaalregistratie nog niet bevestigd.'}</p><p>Documentoverdracht bewijst geen betaalregistratie. Gebruik uitsluitend de door de boekhouder goedgekeurde Mollie-tussenrekening en boekdatum. Bestaande of onzekere boekingen vereisen controle.</p>
      <form action={proFinancialCorrectionAction} className="max-w-xl space-y-4"><fieldset disabled={!enabled || process.env.JORTT_PAYMENT_RECONCILIATION_ENABLED !== 'true'} className="space-y-4">
        <label className="block">Goedgekeurde Jortt-tussenrekening (ID)<input className={field} name="ledgerAccountId" required /></label>
        <label className="block">Boekdatum<input className={field} type="date" name="bookDate" required /></label>
        <Confirmation invoiceId={invoice.id} operation="jortt-payment" /><Button type="submit">Betaling controleren en registreren</Button>
      </fieldset></form>
    </AdminSection> : null}
    <AdminSection title="Controlespoor"><p>{invoice.events.length} recente financiële registraties. Het volledige controlespoor blijft in de financiële administratie beschikbaar.</p></AdminSection>
  </>
}
