import { describe, expect, it } from 'vitest'
import { reviewFinancialChain, validateFinancialReviewCoverage, type FinancialChainEvidence, type PaidProduct } from './financial-chain-review'
const scope = 'organization:synthetic'
function fixture(product: PaidProduct): FinancialChainEvidence {
  const amounts = { net: 2495, vat: 524, gross: 3019, currency: 'EUR' }
  const period = { periodStart: '2026-11-01T00:00:00Z', periodEnd: '2026-12-01T00:00:00Z' }
  return { tenantKey: scope, paymentId: 'tr_synthetic', product, paidAt: '2026-11-02T00:00:00Z', provider: { status: 'paid', gross: 3019, currency: 'EUR' },
    registrations: [{ ...amounts, ...period, id: 'payment', paymentId: 'tr_synthetic' }],
    invoices: [{ ...amounts, ...period, id: 'invoice', paymentId: 'tr_synthetic', tenantKey: scope, original: true, descriptionPresent: true }],
    ledger: { applicable: product === 'CREDIT_PACKAGE', checked: true, expectedCredits: 25, actualCredits: 25, entries: 1 },
    access: { customer: true, administrator: true, pdf: true, tenantIsolation: true },
    jortt: { checked: true, invoiceId: 'remote', documentMatched: true, settled: true, dueCents: 0 }, corrections: [], refunds: [], complete: true }
}
for (const product of ['PRO_SUBSCRIPTION','CREDIT_PACKAGE','ACADEMY_COURSE','COMPLIANCE_SCAN'] as const) describe(product, () => {
  it('requires the complete chain, is deterministic and does not modify evidence', () => {
    const e = fixture(product), before = JSON.stringify(e)
    expect(reviewFinancialChain(e,scope).status).toBe('OK')
    expect(reviewFinancialChain(e,scope)).toEqual(reviewFinancialChain(e,scope))
    expect(JSON.stringify(e)).toBe(before)
    expect(reviewFinancialChain(e,scope,true).status).toBe('RECOVERED')
  })
  it.each(['customer','administrator','pdf','tenantIsolation'] as const)('blocks missing %s proof', key => {
    const e = fixture(product); e.access[key] = false
    expect(reviewFinancialChain(e,scope).status).toBe('DEVIATION')
    e.access[key] = null; expect(reviewFinancialChain(e,scope).status).toBe('INVESTIGATING')
  })
  it('detects missing and duplicate invoices, ledger and payment links', () => {
    const e=fixture(product); e.invoices.push({...e.invoices[0],id:'duplicate'}); e.registrations=[]
    expect(reviewFinancialChain(e,scope).codes).toEqual(expect.arrayContaining(['ORIGINAL_INVOICE_COUNT','PAYMENT_REGISTRATION_COUNT']))
    e.invoices=[]; expect(reviewFinancialChain(e,scope).status).toBe('DEVIATION')
  })
  it('does not confuse document sync with settlement or provider outage', () => {
    const e=fixture(product); e.jortt.settled=false;e.jortt.dueCents=3019
    expect(reviewFinancialChain(e,scope).codes).toContain('JORTT_PAYMENT_OPEN')
    e.jortt.checked=false;expect(reviewFinancialChain(e,scope).status).toBe('INVESTIGATING')
  })
  it('detects VAT, currency and tenant mismatch without exposing other tenants', () => {
    const e=fixture(product);e.invoices[0].vat++;e.invoices[0].currency='USD';e.invoices[0].tenantKey='organization:other'
    expect(reviewFinancialChain(e,scope).codes).toEqual(expect.arrayContaining(['INVOICE_AMOUNTS_MISMATCH','INVOICE_LINK_MISMATCH']))
    expect(()=>reviewFinancialChain(e,'organization:other')).toThrow('SCOPE_MISMATCH')
  })
  it('holds uncertain refunds and rejects missing credit ancestry', () => {
    const e=fixture(product);e.corrections=[{id:'credit',originalInvoiceId:null,tenantKey:scope,gross:-3019,net:-2495,vat:-524}]
    e.refunds=[{id:'refund',recorded:false,gross:3019,registeredGross:null,currency:'EUR',uncertain:true,ageMs:7200000}]
    expect(reviewFinancialChain(e,scope).codes).toEqual(expect.arrayContaining(['CREDIT_SOURCE_MISMATCH','REFUND_REGISTRATION_MISMATCH','REFUND_ACCEPTANCE_UNKNOWN','REFUND_OVERDUE']))
  })
})
it('fails closed on incomplete pagination and duplicate observations',()=> {
  expect(()=>validateFinancialReviewCoverage({complete:false,expectedPaid:0,payments:[]},scope)).toThrow('COVERAGE')
  expect(()=>validateFinancialReviewCoverage({complete:true,expectedPaid:2,payments:[fixture('CREDIT_PACKAGE'),fixture('CREDIT_PACKAGE')]},scope)).toThrow('DUPLICATE')
})
it('unknown data never hides a known deficiency; late collections need review',()=> {
  const e=fixture('PRO_SUBSCRIPTION');e.paidAt='2027-01-01';e.complete=false
  expect(reviewFinancialChain(e,scope).status).toBe('INVESTIGATING')
  e.invoices=[];expect(reviewFinancialChain(e,scope).status).toBe('DEVIATION')
})

it('does not treat an invoice copied period as independent proof',()=>{
 const e=fixture('PRO_SUBSCRIPTION');e.periodVerified=false
 expect(reviewFinancialChain(e,scope).codes).toContain('SUBSCRIPTION_PERIOD_SOURCE_NOT_VERIFIED')
 expect(reviewFinancialChain(e,scope).status).toBe('INVESTIGATING')
})
