import 'server-only'
import { getPrisma } from '@/lib/prisma'
import type { MollieGateway } from './mollie-gateway'
import { confirmsJorttBooking, type JorttPaymentGateway } from './jortt-payment-service'
import type { FinancialChainEvidence, PaidProduct } from './financial-chain-review'
import type { FinancialReviewReader } from './financial-chain-review-service'
import { buildFinancialInvoicePdf } from './financial-invoice-pdf'
const cents = (value: string | undefined) => {
  if (!value || !/^\d+\.\d{2}$/.test(value)) throw new Error('FINANCIAL_REVIEW_AMOUNT_INVALID')
  const result = Number(value.replace('.',''))
  if (!Number.isSafeInteger(result)) throw new Error('FINANCIAL_REVIEW_AMOUNT_INVALID')
  return result
}
/** Only GET/list capabilities are retained; mutation methods cannot be called by this reader. */
export async function createFinancialChainReader(gateway: Pick<MollieGateway,'listPaymentsForReview'|'listRefundsForReview'>, jortt: Pick<JorttPaymentGateway,'inspectPayment'>) {
  if (process.env.FINANCIAL_CHAIN_REVIEW_ENABLED !== 'true') throw new Error('FINANCIAL_CHAIN_REVIEW_DISABLED')
  if (!gateway.listPaymentsForReview || !gateway.listRefundsForReview) throw new Error('FINANCIAL_REVIEW_READER_REQUIRED')
  const remote = await gateway.listPaymentsForReview()
  if (new Set(remote.map(p=>p.id)).size!==remote.length) throw new Error('FINANCIAL_REVIEW_DUPLICATE_PAYMENT')
  const db=getPrisma(), scoped: FinancialChainEvidence[]=[]
  const ids=remote.map(p=>p.id)
  const missing=await db.financialPurchase.count({where:{paidAt:{not:null},molliePaymentId:{not:null,notIn:ids}}})
    + await db.professionalSubscriptionPayment.count({where:{status:'PAID',molliePaymentId:{notIn:ids}}})
  if(missing) throw new Error('FINANCIAL_REVIEW_PROVIDER_COVERAGE_MISMATCH')
  for (const payment of remote) {
    if (payment.status!=='paid' || !payment.paidAt) throw new Error('FINANCIAL_REVIEW_PAYMENT_NOT_FINAL')
    const [purchases,recurring,invoices] = await Promise.all([
      db.financialPurchase.findMany({where:{molliePaymentId:payment.id},include:{creditedTransaction:true}}),
      db.professionalSubscriptionPayment.findMany({where:{molliePaymentId:payment.id,status:'PAID'},include:{subscription:true}}),
      db.financialInvoice.findMany({where:{molliePaymentId:payment.id},include:{jorttSync:true,lines:true,vatSummaries:true}}),
    ])
    const purchase=purchases[0]
    const organizationId=payment.metadata.organizationId ?? purchase?.organizationId ?? recurring[0]?.subscription.organizationId
    const tenantKey=organizationId ? `organization:${organizationId}` : purchase?.createdByUserId ? `customer:${purchase.createdByUserId}` : null
    if (!tenantKey || purchases.some(p=>p.organizationId!==(organizationId??null)) || recurring.some(p=>p.subscription.organizationId!==organizationId)) throw new Error('FINANCIAL_REVIEW_UNASSIGNED_PAYMENT')
    const product=purchase?.kind ?? (recurring.length || payment.metadata.subscriptionId ? 'PRO_SUBSCRIPTION' : null)
    if (!product || !['PRO_SUBSCRIPTION','CREDIT_PACKAGE','ACADEMY_COURSE','COMPLIANCE_SCAN'].includes(product)) throw new Error('FINANCIAL_REVIEW_PRODUCT_UNSUPPORTED')
    const original=invoices.find(i=>i.documentType==='INVOICE'), sync=original?.jorttSync
    const registrationAmounts=(p:{amountExclVatCents:number;vatAmountCents:number;amountInclVatCents:number;currency:string})=>({net:p.amountExclVatCents,vat:p.vatAmountCents,gross:p.amountInclVatCents,currency:p.currency})
    let remoteInvoice: Awaited<ReturnType<JorttPaymentGateway['inspectPayment']>> | null=null
    if (sync?.status==='SYNCED' && sync.externalReference) remoteInvoice=await jortt.inspectPayment(sync.externalReference)
    // A zero balance alone cannot identify the payment, clearing account or book date.
    const confirmed = remoteInvoice && original ? await db.financialEvent.findUnique({where:{idempotencyKey:`jortt-payment-confirmed:${original.id}`}}) : null
    const booking = confirmed?.metadata
    let pdf: boolean | null=null
    if (original) { try { const bytes=await buildFinancialInvoicePdf(original);pdf=Buffer.from(bytes).subarray(0,4).toString('ascii')==='%PDF' } catch { pdf=false } }
    const refunds=await gateway.listRefundsForReview(payment.id)
    const localRefunds=await db.financialRefund.findMany({where:{OR:[{purchase:{molliePaymentId:payment.id}},{proCreditNote:{molliePaymentId:payment.id}}]}})
    const missingRemote=localRefunds.filter(r=>!refunds.some(remote=>remote.id===r.mollieRefundId) && (r.status==='PENDING'||r.status==='REFUNDED'))
    const paidPurchases=purchases.filter(p=>p.paidAt && ['PAID','PARTIALLY_REFUNDED','REFUNDED','REFUND_REVIEW_REQUIRED'].includes(p.status))
    scoped.push({tenantKey,paymentId:payment.id,product:product as PaidProduct,paidAt:payment.paidAt,provider:{status:'paid',gross:cents(payment.amountValue),currency:payment.currency},
      registrations:[...paidPurchases.map(p=>({...registrationAmounts(p),id:p.id,paymentId:payment.id,
        ...(product==='PRO_SUBSCRIPTION' ? {periodStart:original?.servicePeriodStart?.toISOString(),periodEnd:original?.servicePeriodEnd?.toISOString()} : {})})),
        ...recurring.map(p=>({...registrationAmounts(p),id:p.id,paymentId:payment.id,periodStart:p.periodStart?.toISOString(),periodEnd:p.periodEnd?.toISOString()}))],
      invoices:invoices.map(i=>({...registrationAmounts(i),id:i.id,paymentId:i.molliePaymentId??'',tenantKey:i.organizationId?`organization:${i.organizationId}`:purchase?.createdByUserId?`customer:${purchase.createdByUserId}`:'UNASSIGNED',original:i.documentType==='INVOICE',descriptionPresent:!!i.packageLabel && (i.snapshotVersion!==2||i.lines.length>0),periodStart:i.servicePeriodStart?.toISOString(),periodEnd:i.servicePeriodEnd?.toISOString()})),
      ledger:{applicable:product==='CREDIT_PACKAGE',checked:true,expectedCredits:purchase?.credits??0,actualCredits:purchase?.creditedTransaction?.totalDelta??0,entries:purchase?.creditedTransaction?1:0},
      // These are actual route acceptance claims, not derivable from a provider GET.
      access:{customer:null,administrator:null,tenantIsolation:null,pdf},
      jortt:{checked:!!remoteInvoice,invoiceId:remoteInvoice?.id??null,documentMatched:!!remoteInvoice && remoteInvoice.id===sync?.externalReference && remoteInvoice.reference===original?.invoiceNumber && remoteInvoice.totalCents===original?.amountInclVatCents && remoteInvoice.currency===original?.currency,confirmationRecorded:!!confirmed,settled:!!remoteInvoice && !!original && !!booking && typeof booking==='object' && !Array.isArray(booking) && confirmsJorttBooking(remoteInvoice,original,booking.ledgerAccountId,booking.bookDate) && remoteInvoice.bookings[0].id===booking.bookingId,dueCents:remoteInvoice?.dueCents??null},
      corrections:invoices.filter(i=>i.documentType==='CREDIT_NOTE').map(i=>({id:i.id,originalInvoiceId:i.originalInvoiceId,tenantKey:i.organizationId?`organization:${i.organizationId}`:tenantKey,gross:i.amountInclVatCents,net:i.amountExclVatCents,vat:i.vatAmountCents})),
      refunds:[...refunds.map(r=>{const local=localRefunds.find(l=>l.mollieRefundId===r.id);return {id:r.id,recorded:!!local,gross:cents(r.amountValue),registeredGross:local?.amountCents??null,currency:r.currency??'',uncertain:!!local?.reconciliationRequired||['pending','queued','processing'].includes(r.status),ageMs:local?Date.now()-local.requestedAt.getTime():0}}),
        ...missingRemote.map(r=>({id:r.id,recorded:true,gross:r.amountCents,registeredGross:r.amountCents,currency:payment.currency,uncertain:true,ageMs:Date.now()-r.requestedAt.getTime()}))],subscriptionBehind:recurring.some(p=>p.periodEnd && (!p.subscription.currentPeriodEnd || p.subscription.currentPeriodEnd < p.periodEnd)),periodVerified:product!=='PRO_SUBSCRIPTION'||recurring.length===1,complete:true})
  }
  const reader: FinancialReviewReader={async read({tenantKey}){const payments=scoped.filter(e=>e.tenantKey===tenantKey);return {complete:true,expectedPaid:payments.length,payments}}}
  return {reader,scopes:[...new Set(scoped.map(e=>e.tenantKey))],paymentCount:scoped.length}
}
