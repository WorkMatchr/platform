import { beforeEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks=vi.hoisted(()=>({membership:vi.fn(),invoices:vi.fn(),purchases:vi.fn(),subscription:vi.fn()}))
vi.mock('@/lib/organizations/organization-authorization',()=>({requireOrganizationMembership:mocks.membership}))
vi.mock('@/lib/marketplace/credit-service',()=>({getProviderCreditOverview:async()=>({totalBalance:0,reservedBalance:0,availableBalance:0,transactions:[]})}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>({organization:{findUnique:async()=>({name:'Synthetic',locations:[]})},financialPurchase:{findMany:mocks.purchases},professionalSubscription:{findUnique:mocks.subscription},financialInvoice:{findMany:mocks.invoices}})}))
vi.mock('@/components/finance/credit-purchase-checkout',()=>({CreditPurchaseCheckout:()=>null}))
vi.mock('./actions',()=>({previewCreditPurchaseAction:vi.fn(),startCreditPurchaseAction:vi.fn()}))
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND')}}))
import CreditsPage from './page'

beforeEach(()=>{
  vi.resetAllMocks()
  mocks.membership.mockResolvedValue({user:{id:'synthetic-user',accountType:'PROFESSIONAL'},activeMembership:{organization:{id:'tenant-a',providerProfile:{}}}})
  mocks.purchases.mockResolvedValue([])
  mocks.subscription.mockResolvedValue({status:'CANCELED'})
  mocks.invoices.mockResolvedValue([{id:'synthetic-recurring',invoiceNumber:'TEST-0001',issuedAt:new Date('2026-11-06'),documentType:'INVOICE',packageLabel:'Synthetic Pro month',amountInclVatCents:5929}])
})

it('shows a recurring invoice without a purchase, also after cancellation',async()=>{
  const html=renderToStaticMarkup(await CreditsPage({searchParams:Promise.resolve({})}))
  expect(html).toContain('/credits/facturen/synthetic-recurring')
  expect(html).toContain('TEST-0001')
  expect(mocks.invoices).toHaveBeenCalledWith(expect.objectContaining({where:{organizationId:'tenant-a'},take:50}))
})

it('selects only the currently authorized organization, not a requested tenant',async()=>{
  mocks.membership.mockResolvedValue({user:{id:'other-user',accountType:'PROFESSIONAL'},activeMembership:{organization:{id:'tenant-b',providerProfile:{}}}})
  mocks.invoices.mockResolvedValue([])
  const html=renderToStaticMarkup(await CreditsPage({searchParams:Promise.resolve({})}))
  expect(mocks.invoices).toHaveBeenCalledWith(expect.objectContaining({where:{organizationId:'tenant-b'}}))
  expect(html).not.toContain('synthetic-recurring')
})

it('does not read invoices after membership access has been revoked',async()=>{
  mocks.membership.mockRejectedValue(new Error('ACCESS_REVOKED'))
  await expect(CreditsPage({searchParams:Promise.resolve({})})).rejects.toThrow('ACCESS_REVOKED')
  expect(mocks.invoices).not.toHaveBeenCalled()
})
