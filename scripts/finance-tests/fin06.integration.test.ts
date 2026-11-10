import { it, expect, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../src/generated/prisma/client'
import { getPrisma } from '../../src/lib/prisma'
const mock = vi.hoisted(() => ({ admin: '', read: vi.fn() }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAdministrator: async () => ({ id: mock.admin }) }))
vi.mock('../../src/lib/finance/mollie-gateway', async original => ({ ...await original<typeof import('../../src/lib/finance/mollie-gateway')>(), createMollieGateway: () => ({ getPayment: mock.read }) }))
vi.mock('../../src/lib/finance/pro-historical-recovery', async original => ({ ...await original<typeof import('../../src/lib/finance/pro-historical-recovery')>(), historicalRecoveryDate: (id: string) => id === 'tr_fin06_synthetic' ? '2026-10-04' : undefined }))

it.skipIf(process.env.RUN_FIN06_PG !== '1')('herhaalt een historische betaling op een lege lokale PostgreSQL-testdatabase', async () => {
  const url = new URL(process.env.DATABASE_URL!)
  expect([url.hostname,url.pathname]).toEqual(['127.0.0.1','/fin06_b4d8ac'])
  const prisma = getPrisma()
  try {
    expect(await prisma.organization.count()).toBe(0)
    const organization = await prisma.organization.create({ data: { name: 'TEST-WM Finance Professional', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const user = await prisma.user.create({ data: { email: `finance-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.providerProfile.create({ data: { organizationId: organization.id } })
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' } })

    const startedAt = new Date('2026-09-04T19:00:48Z')
    const pricing = {
      amountExclVatCents: 4900, vatRateBps: 2100, vatAmountCents: 1029,
      amountInclVatCents: 5929, currency: 'EUR',
    }
    const purchase = {
      ...pricing, organizationId: organization.id, createdByUserId: user.id,
      kind: 'PRO_SUBSCRIPTION' as const, packageSku: 'WORKMATCHR_PRO',
      packageLabel: 'Synthetic Pro', credits: 0, baseAmountCents: 4900,
      discountCodeSnapshot: Prisma.DbNull, terminalAt: startedAt,
      billingOrganizationName: 'Synthetic company', billingAddressLine: 'Teststraat 1',
      billingPostalCode: '1000 AA', billingCity: 'Testplaats', billingCountryCode: 'NL',
    }
    const failedFirst = await prisma.financialPurchase.create({
      data: { ...purchase, status: 'EXPIRED', molliePaymentId: 'tr_p1first', idempotencyKey: randomUUID() },
    })
    const paidRetry = await prisma.financialPurchase.create({
      data: { ...purchase, status: 'PAID', paidAt: startedAt, molliePaymentId: 'tr_p1retry', idempotencyKey: randomUUID() },
    })
    const pro = await prisma.professionalSubscription.create({ data: {
      ...pricing, organizationId: organization.id, status: 'ACTIVE', planCode: purchase.packageSku,
      planLabel: purchase.packageLabel, mollieCustomerId: 'cst_p1', mollieSubscriptionId: 'sub_p1',
      mollieMandateId: 'mdt_p1', mollieMandateMethod: 'directdebit', mollieMandateStatus: 'valid',
      mollieMandateVerifiedAt: startedAt, firstPaymentPurchaseId: failedFirst.id,
      currentPeriodStart: startedAt, currentPeriodEnd: new Date('2026-10-04T19:00:48Z'),
    } })
    await prisma.professionalSubscriptionFirstPaymentAttempt.create({
      data: { subscriptionId: pro.id, purchaseId: paidRetry.id, attemptNumber: 1 },
    })
    const { issueInvoiceForPaidPurchase } = await import('../../src/lib/finance/invoice-service')
    await prisma.$transaction(transaction => issueInvoiceForPaidPurchase(transaction, paidRetry.id))
    const recurring = (id: string, date: string, status: 'paid' | 'failed' = 'paid') => ({
      id, status, createdAt: date, paidAt: status === 'paid' ? date : null, checkoutUrl: null,
      amountValue: '59.29', currency: pricing.currency, subscriptionId: 'sub_p1', mandateId: 'mdt_p1',
      method: 'directdebit', metadata: { subscriptionId: pro.id, organizationId: organization.id },
    })

    const platform = await prisma.organization.create({data:{name:'Synthetic operator',status:'ACTIVE',organizationType:'PLATFORM_OPERATOR',systemKey:'WORKMATCHR_PLATFORM'}})
    const admin = await prisma.user.create({data:{email:'fin06@example.invalid',status:'ACTIVE',emailVerified:true,platformRole:'ADMIN'}})
    await prisma.organizationMembership.create({data:{userId:admin.id,organizationId:platform.id,status:'ACTIVE',role:'OWNER'}})
    mock.admin = admin.id
    const id = 'tr_fin06_synthetic'
    vi.stubEnv('PRO_RECOVERY_APPROVED_PAYMENT_ID',id)
    mock.read.mockResolvedValue({...recurring(id,'2026-10-04T19:00:48Z'),paidAt:'2026-10-06T06:00:00Z',customerId:'cst_p1',mode:'live'})
    const { recoverHistoricalProPayment } = await import('../../src/lib/finance/subscription-service')
    const wallets = () => Promise.all([prisma.creditAccount.findMany(),prisma.creditTransaction.findMany(),prisma.creditReservation.findMany()])
    const before = await wallets()
    await recoverHistoricalProPayment(id)
    await recoverHistoricalProPayment(id)
    expect(await prisma.professionalSubscriptionPayment.count({where:{molliePaymentId:id,status:'PAID'}})).toBe(1)
    const invoices = await prisma.financialInvoice.findMany({where:{molliePaymentId:id},include:{jorttSync:true}})
    expect(invoices).toHaveLength(1)
    const invoice=invoices[0]
    expect(invoice).toMatchObject({jorttSync:null,amountExclVatCents:4900,amountInclVatCents:5929,vatAmountCents:1029,organizationId:organization.id,documentType:'INVOICE'})
    const audit = await prisma.financialEvent.findMany({where:{invoiceId:invoice.id}})
    expect(audit.map(e=>e.eventType).sort()).toEqual(['PRO_INVOICE_ISSUED','PRO_RECOVERY_JORTT_HELD'])
    expect(audit.find(e=>e.eventType==='PRO_RECOVERY_JORTT_HELD')?.actorUserId).toBe(admin.id)
    expect(await prisma.financialEvent.count({where:{subscriptionId:pro.id,eventType:'PRO_PAYMENT_VALIDATED'}})).toBe(1)
    const period=await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})
    expect(period.currentPeriodStart?.toISOString()).toBe('2026-10-04T19:00:48.000Z')
    expect(period.currentPeriodEnd?.toISOString()).toBe('2026-11-04T19:00:48.000Z')
    expect(await wallets()).toEqual(before)
    const {syncFinancialInvoiceToJortt}=await import('../../src/lib/finance/jortt-sync-service')
    const submitInvoice=vi.fn()
    await expect(syncFinancialInvoiceToJortt(invoice.id,{submitInvoice})).rejects.toThrow('JORTT_SYNC_NOT_FOUND')
    expect(submitInvoice).not.toHaveBeenCalled()
    const { retryDueJorttSyncs } = await import('../../src/lib/finance/jortt-sync-service')
    const { releaseHistoricalInvoice } = await import('../../src/lib/finance/pro-historical-recovery')
    submitInvoice.mockImplementation(async payload => ({
      externalReference: 'fake-' + payload.invoiceId, remoteInvoiceNumber: 'TEST-' + payload.invoiceNumber,
    }))
    await retryDueJorttSyncs({ submitInvoice })
    expect(submitInvoice.mock.calls.map(([payload]) => payload.paymentReference)).toEqual(['tr_p1retry'])
    await expect(releaseHistoricalInvoice(invoice.id)).rejects.toThrow('PRO_RECOVERY_RELEASE_NOT_APPROVED')
    vi.stubEnv('PRO_RECOVERY_APPROVED_INVOICE_ID', invoice.id)
    await releaseHistoricalInvoice(invoice.id)
    await releaseHistoricalInvoice(invoice.id)
    await retryDueJorttSyncs({ submitInvoice })
    await syncFinancialInvoiceToJortt(invoice.id, { submitInvoice })
    expect(submitInvoice.mock.calls.map(([payload]) => payload.paymentReference)).toEqual(['tr_p1retry', id])
    expect(await prisma.financialJorttSync.count({ where: { invoiceId: invoice.id, status: 'SYNCED', attemptCount: 1 } })).toBe(1)
    expect(await prisma.financialEvent.count({ where: { invoiceId: invoice.id, eventType: 'PRO_RECOVERY_JORTT_RELEASED', actorUserId: admin.id } })).toBe(1)
  } finally {vi.unstubAllEnvs(); await prisma.$disconnect()}
},60000)
