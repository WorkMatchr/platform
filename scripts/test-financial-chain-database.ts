import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'
import { Prisma } from '../src/generated/prisma/client'

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) throw new Error('De financiële databasetest mag uitsluitend lokaal draaien.')
const databaseName = `workmatchr_finance_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deploySchema() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: 'utf8', stdio: 'pipe',
  })
  if (result.status !== 0) throw new Error(`Migraties in financiële testdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma')['getPrisma']>> | null = null
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deploySchema()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    prisma = getPrisma()
    const organization = await prisma.organization.create({ data: { name: 'TEST-WM Finance Professional', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const user = await prisma.user.create({ data: { email: `finance-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.providerProfile.create({ data: { organizationId: organization.id } })
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' } })
    const secondOrganization = await prisma.organization.create({ data: { name: 'TEST-WM Finance Professional Twee', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const secondUser = await prisma.user.create({ data: { email: `finance-two-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.providerProfile.create({ data: { organizationId: secondOrganization.id } })
    await prisma.organizationMembership.create({ data: { userId: secondUser.id, organizationId: secondOrganization.id, role: 'OWNER', status: 'ACTIVE' } })
    const platformOrganization = await prisma.organization.create({ data: { name: 'TEST-WM Platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
    const platformAdministrator = await prisma.user.create({ data: { email: `finance-admin-${randomUUID()}@example.invalid`, platformRole: 'ADMIN', status: 'ACTIVE', emailVerified: true } })
    await prisma.organizationMembership.create({ data: { userId: platformAdministrator.id, organizationId: platformOrganization.id, role: 'OWNER', status: 'ACTIVE' } })

    const purchases = await Promise.all(Array.from({ length: 12 }, (_, index) => prisma!.financialPurchase.create({
      data: {
        organizationId: organization.id, createdByUserId: user.id, status: 'PAID', packageSku: `TEST_${index}`,
        packageLabel: 'Fictief financieel integratiepakket', credits: 25, baseAmountCents: 2_500,
        amountExclVatCents: 2_500, vatRateBps: 2_100, vatAmountCents: 525, amountInclVatCents: 3_025,
        currency: 'EUR', billingOrganizationName: organization.name, billingAddressLine: 'Teststraat 1',
        billingPostalCode: '9405 LC', billingCity: 'Assen', billingCountryCode: 'NL', molliePaymentId: `tr_test${index}`,
        idempotencyKey: `finance-db-purchase-${index}-${randomUUID()}`, paidAt: new Date(), terminalAt: new Date(),
      },
    })))

    const runSerializable = async <T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>) => {
      for (let attempt = 1; attempt <= 12; attempt += 1) {
        try {
          return await prisma!.$transaction(operation, { isolationLevel: 'Serializable' })
        } catch (error) {
          const retryable = error instanceof Error && (error.message.includes('40001') || ('code' in error && error.code === 'P2034'))
          if (!retryable || attempt === 12) throw error
          await new Promise((resolve) => setTimeout(resolve, attempt * 25 + Math.floor(Math.random() * 25)))
        }
      }
      throw new Error('SERIALIZABLE_RETRY_EXHAUSTED')
    }
    const invoices = await Promise.all(purchases.map((purchase) => runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended('financial-invoice-counter', 0))::text AS "lock"`)
      await transaction.$executeRaw(Prisma.sql`INSERT INTO "FinancialInvoiceCounter" ("id", "nextNumber", "updatedAt") VALUES (1, 1, NOW()) ON CONFLICT ("id") DO NOTHING`)
      const [counter] = await transaction.$queryRaw<Array<{ nextNumber: number }>>(Prisma.sql`SELECT "nextNumber" FROM "FinancialInvoiceCounter" WHERE "id" = 1 FOR UPDATE`)
      assert.ok(counter)
      await transaction.financialInvoiceCounter.update({ where: { id: 1 }, data: { nextNumber: counter.nextNumber + 1 } })
      return transaction.financialInvoice.create({ data: {
        invoiceNumber: `WM-26085${String(counter.nextNumber).padStart(3, '0')}`, sequenceNumber: counter.nextNumber,
        purchaseId: purchase.id, organizationId: organization.id, issuedAt: new Date(), sellerLegalName: 'Feenstra Safety Consulting',
        sellerTradeName: 'WorkMatchr', sellerAddressLine: 'Kennemerland 71', sellerPostalCode: '9405 LC', sellerCity: 'Assen',
        sellerCountryCode: 'NL', sellerKvKNumber: '57788863', sellerVatId: 'NL002107278B11',
        customerOrganizationName: organization.name, customerAddressLine: 'Teststraat 1', customerPostalCode: '9405 LC',
        customerCity: 'Assen', customerCountryCode: 'NL', packageSku: purchase.packageSku, packageLabel: purchase.packageLabel,
        credits: purchase.credits, baseAmountCents: 2_500, packageDiscountCents: 0, proDiscountCents: 0,
        discountCodeDiscountCents: 0, amountExclVatCents: 2_500, vatRateBps: 2_100, vatAmountCents: 525,
        amountInclVatCents: 3_025, currency: 'EUR', molliePaymentId: purchase.molliePaymentId,
      } })
    })))
    assert.deepEqual(invoices.map((invoice) => invoice.sequenceNumber).sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1))
    assert.equal(new Set(invoices.map((invoice) => invoice.invoiceNumber)).size, 12)

    const first = purchases[0]
    await assert.rejects(() => prisma!.financialPurchase.update({ where: { id: first.id }, data: { amountInclVatCents: 9_999 } }), /snapshot is immutable/i)
    await prisma.financialPurchase.update({ where: { id: first.id }, data: { status: 'REFUND_REVIEW_REQUIRED' } })
    const eventKey = `payment-state:${randomUUID()}`
    const paymentEvents = await Promise.all(Array.from({ length: 8 }, () => runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`finance:${first.id}`}, 0))::text AS "lock"`)
      return transaction.financialPaymentEvent.upsert({
        where: { idempotencyKey: eventKey }, update: {}, create: {
          purchaseId: first.id, molliePaymentId: first.molliePaymentId!, status: 'PAID', amountCents: 3_025,
          currency: 'EUR', payloadFingerprint: 'a'.repeat(64), idempotencyKey: eventKey,
        },
      })
    })))
    assert.equal(new Set(paymentEvents.map((event) => event.id)).size, 1)
    await assert.rejects(() => prisma!.financialPaymentEvent.update({ where: { id: paymentEvents[0].id }, data: { amountCents: 1 } }), /immutable/i)
    await assert.rejects(() => prisma!.discountCode.create({ data: {
      code: `INVALID-${randomUUID()}`, validFrom: new Date(), applicablePackageSkus: [], createdByUserId: user.id,
    } }))
    console.log('Financiële migratie, constraints, snapshots, idempotentie en factuurnummerconcurrency zijn geslaagd.')
    const periodStart = new Date('2026-08-09T12:00:00Z')
    const periodEnd = new Date('2026-09-09T12:00:00Z')
    const subscription = await prisma.professionalSubscription.create({ data: {
      organizationId: organization.id, status: 'ACTIVE', planCode: 'WORKMATCHR_PRO_MONTHLY', planLabel: 'WorkMatchr Pro',
      amountExclVatCents: 4_900, vatRateBps: 2_100, vatAmountCents: 1_029, amountInclVatCents: 5_929,
      currency: 'EUR', mollieCustomerId: `cst_${randomUUID()}`, mollieSubscriptionId: `sub_${randomUUID()}`,
      currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, activatedAt: periodStart,
    } })
    const mandateVerifiedAt = new Date('2026-08-09T12:01:00Z')
    const mandateSubscription = await prisma.professionalSubscription.update({ where: { id: subscription.id }, data: {
      mollieMandateId: `mdt_${randomUUID()}`, mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit', mollieMandateVerifiedAt: mandateVerifiedAt,
    } })
    assert.equal(mandateSubscription.mollieMandateMethod, 'directdebit')
    await assert.rejects(() => prisma!.professionalSubscription.update({
      where: { id: subscription.id }, data: { mollieMandateStatus: 'pending' },
    }), /mandate_projection_check/i)
    const scheduled = await prisma.professionalSubscription.update({ where: { id: subscription.id }, data: {
      cancelAtPeriodEnd: true, cancellationRequestedAt: periodStart, cancellationEffectiveAt: periodEnd,
    } })
    assert.equal(scheduled.status, 'ACTIVE')
    assert.equal(scheduled.cancellationEffectiveAt?.toISOString(), periodEnd.toISOString())
    await assert.rejects(() => prisma!.professionalSubscription.update({ where: { id: subscription.id }, data: { status: 'SUSPENDED' } }), /cancellation_schedule_check/i)
    const cancellationEvent = await prisma.financialEvent.create({ data: {
      actorUserId: user.id, subscriptionId: subscription.id, eventType: 'PRO_SUBSCRIPTION_CANCELLATION_SCHEDULED',
      result: 'SUCCEEDED', idempotencyKey: `pro-cancellation-scheduled:${subscription.id}`,
    } })
    await assert.rejects(() => prisma!.financialEvent.update({ where: { id: cancellationEvent.id }, data: { result: 'CHANGED' } }), /immutable/i)
    await prisma.professionalSubscription.update({ where: { id: subscription.id }, data: {
      status: 'CANCELED', cancelAtPeriodEnd: false, cancellationRequestedAt: null, cancellationEffectiveAt: null, canceledAt: periodEnd,
    } })

    const reserveDiscount = (input: { organizationId: string; actorUserId: string; discountCodeId: string; idempotencyKey: string }) => runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`finance:discount:${input.discountCodeId}`}, 0))::text AS "lock"`)
      const discount = await transaction.discountCode.findUniqueOrThrow({ where: { id: input.discountCodeId } })
      const activeUses = await transaction.discountRedemption.count({ where: { discountCodeId: discount.id, status: { in: ['RESERVED', 'APPLIED'] } } })
      if (discount.maximumUses !== null && activeUses >= discount.maximumUses) throw new Error('DISCOUNT_MAXIMUM_REACHED')
      if (discount.oncePerOrganization && await transaction.discountRedemption.findFirst({ where: { discountCodeId: discount.id, organizationId: input.organizationId, status: { in: ['RESERVED', 'APPLIED'] } } })) throw new Error('DISCOUNT_ALREADY_USED')
      const purchase = await transaction.financialPurchase.create({ data: {
        organizationId: input.organizationId, createdByUserId: input.actorUserId, packageSku: 'CREDITS_25', packageLabel: '25 credits', credits: 25,
        baseAmountCents: 2_500, discountCodeDiscountCents: 100, amountExclVatCents: 2_400, vatRateBps: 2_100, vatAmountCents: 504,
        amountInclVatCents: 2_904, currency: 'EUR', discountCodeId: discount.id, billingOrganizationName: 'TEST-WM Professional',
        billingAddressLine: 'Teststraat 1', billingPostalCode: '9405 LC', billingCity: 'Assen', billingCountryCode: 'NL', idempotencyKey: input.idempotencyKey,
      } })
      const redemption = await transaction.discountRedemption.create({ data: {
        discountCodeId: discount.id, organizationId: input.organizationId, purchaseId: purchase.id, discountCents: 100,
        idempotencyKey: `discount-reservation:${purchase.id}`,
      } })
      return { purchase, redemption }
    })

    const maximumCode = await prisma.discountCode.create({ data: {
      code: `MAX-${randomUUID()}`.slice(0, 40).toUpperCase(), validFrom: new Date('2026-01-01'), maximumUses: 1,
      applicablePackageSkus: ['CREDITS_25'], fixedAmountCents: 100, createdByUserId: platformAdministrator.id,
    } })
    const maximumRace = await Promise.allSettled([
      reserveDiscount({ actorUserId: user.id, organizationId: organization.id, discountCodeId: maximumCode.id, idempotencyKey: `discount-max-a-${randomUUID()}` }),
      reserveDiscount({ actorUserId: secondUser.id, organizationId: secondOrganization.id, discountCodeId: maximumCode.id, idempotencyKey: `discount-max-b-${randomUUID()}` }),
    ])
    assert.equal(maximumRace.filter((item) => item.status === 'fulfilled').length, 1)
    assert.equal(await prisma.discountRedemption.count({ where: { discountCodeId: maximumCode.id, status: { in: ['RESERVED', 'APPLIED'] } } }), 1)

    const onceCode = await prisma.discountCode.create({ data: {
      code: `ONCE-${randomUUID()}`.slice(0, 40).toUpperCase(), validFrom: new Date('2026-01-01'), maximumUses: 10, oncePerOrganization: true,
      applicablePackageSkus: ['CREDITS_25'], percentageBps: 500, createdByUserId: platformAdministrator.id,
    } })
    const onceRace = await Promise.allSettled([
      reserveDiscount({ actorUserId: user.id, organizationId: organization.id, discountCodeId: onceCode.id, idempotencyKey: `discount-once-a-${randomUUID()}` }),
      reserveDiscount({ actorUserId: user.id, organizationId: organization.id, discountCodeId: onceCode.id, idempotencyKey: `discount-once-b-${randomUUID()}` }),
    ])
    assert.equal(onceRace.filter((item) => item.status === 'fulfilled').length, 1)
    assert.equal(await prisma.discountRedemption.count({ where: { discountCodeId: onceCode.id, organizationId: organization.id, status: { in: ['RESERVED', 'APPLIED'] } } }), 1)

    const releaseCode = await prisma.discountCode.create({ data: {
      code: `RELEASE-${randomUUID()}`.slice(0, 40).toUpperCase(), validFrom: new Date('2026-01-01'), maximumUses: 1,
      applicablePackageSkus: ['CREDITS_25'], fixedAmountCents: 100, createdByUserId: platformAdministrator.id,
    } })
    const failedPurchase = await reserveDiscount({ actorUserId: user.id, organizationId: organization.id, discountCodeId: releaseCode.id, idempotencyKey: `discount-release-a-${randomUUID()}` })
    await prisma.$transaction([
      prisma.financialPurchase.update({ where: { id: failedPurchase.purchase.id }, data: { status: 'FAILED', terminalAt: new Date() } }),
      prisma.discountRedemption.update({ where: { id: failedPurchase.redemption.id }, data: { status: 'RELEASED', releasedAt: new Date() } }),
    ])
    assert.equal(await prisma.discountRedemption.count({ where: { discountCodeId: releaseCode.id, status: 'RELEASED' } }), 1)
    await reserveDiscount({ actorUserId: secondUser.id, organizationId: secondOrganization.id, discountCodeId: releaseCode.id, idempotencyKey: `discount-release-b-${randomUUID()}` })
    assert.equal(await prisma.discountRedemption.count({ where: { discountCodeId: releaseCode.id, status: 'RESERVED' } }), 1)

    const starterInput = { actorUserId: platformAdministrator.id, organizationId: organization.id, chamberOfCommerceNumber: 'TEST-KVK-12345678', accountIdentity: 'TEST-WM Finance Professional', organizationName: organization.name, city: 'Assen' }
    const hash = (value: string) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
    const grantStarter = (input: typeof starterInput & { idempotencyKey: string }) => runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`starter:${input.organizationId}`}, 0))::text AS "lock"`)
      const existing = await transaction.starterBenefitReview.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { grant: true } })
      if (existing) return { review: existing, grant: existing.grant }
      const chamberOfCommerceHash = hash(input.chamberOfCommerceNumber.replace(/\D/g, ''))
      const alreadyGranted = await transaction.starterBenefitGrant.findUnique({ where: { chamberOfCommerceHash } })
      const review = await transaction.starterBenefitReview.create({ data: {
        organizationId: input.organizationId, reviewedByUserId: input.actorUserId, decision: alreadyGranted ? 'INELIGIBLE' : 'ELIGIBLE', evidenceSource: 'KVK_PROVIDER',
        chamberOfCommerceDate: new Date('2026-03-01'), chamberOfCommerceHash, accountIdentityHash: hash(input.accountIdentity),
        nameCityHash: hash(`${input.organizationName}|${input.city}`), reason: 'Gecontroleerde fictieve concurrencytest.', idempotencyKey: input.idempotencyKey,
      } })
      if (alreadyGranted) return { review, grant: null }
      const grantId = randomUUID()
      const account = await transaction.creditAccount.upsert({ where: { organizationId: input.organizationId }, update: {}, create: { organizationId: input.organizationId } })
      const ledger = await transaction.creditTransaction.create({ data: {
        creditAccountId: account.id, type: 'CONTRIBUTION_BONUS', amount: 25, totalDelta: 25, reservedDelta: 0, balanceAfter: 25,
        referenceType: 'StarterBenefitGrant', referenceId: grantId, reason: 'Gecontroleerde fictieve concurrencytest.',
        idempotencyKey: `starter-benefit-ledger:${review.id}`, createdByUserId: input.actorUserId,
      } })
      const grant = await transaction.starterBenefitGrant.create({ data: {
        id: grantId, organizationId: input.organizationId, reviewId: review.id, grantedByUserId: input.actorUserId, credits: 25,
        chamberOfCommerceHash, ledgerTransactionId: ledger.id, idempotencyKey: `starter-benefit-grant:${input.idempotencyKey}`,
      } })
      return { review, grant }
    })
    const starterRace = await Promise.all([
      grantStarter({ ...starterInput, idempotencyKey: `starter-race-a-${randomUUID()}` }),
      grantStarter({ ...starterInput, idempotencyKey: `starter-race-b-${randomUUID()}` }),
    ])
    assert.equal(starterRace.filter((item) => item.grant).length, 1)
    assert.equal(await prisma.starterBenefitGrant.count({ where: { organizationId: organization.id } }), 1)
    assert.equal(await prisma.creditTransaction.count({ where: { referenceType: 'StarterBenefitGrant', creditAccount: { organizationId: organization.id } } }), 1)

    const identityOrganizationA = await prisma.organization.create({ data: { name: 'TEST-WM Identity A', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const identityOrganizationB = await prisma.organization.create({ data: { name: 'TEST-WM Identity B', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    await prisma.providerProfile.createMany({ data: [{ organizationId: identityOrganizationA.id }, { organizationId: identityOrganizationB.id }] })
    const identityUserA = await prisma.user.create({ data: { email: `identity-a-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    const identityUserB = await prisma.user.create({ data: { email: `identity-b-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.organizationMembership.createMany({ data: [
      { userId: identityUserA.id, organizationId: identityOrganizationA.id, role: 'OWNER', status: 'ACTIVE' },
      { userId: identityUserB.id, organizationId: identityOrganizationB.id, role: 'OWNER', status: 'ACTIVE' },
    ] })
    const identityNumber = 'TEST-KVK-87654321'
    const identityRace = await Promise.allSettled([
      grantStarter({ ...starterInput, organizationId: identityOrganizationA.id, chamberOfCommerceNumber: identityNumber, accountIdentity: 'Identity A', organizationName: identityOrganizationA.name, idempotencyKey: `starter-identity-a-${randomUUID()}` }),
      grantStarter({ ...starterInput, organizationId: identityOrganizationB.id, chamberOfCommerceNumber: identityNumber, accountIdentity: 'Identity B', organizationName: identityOrganizationB.name, idempotencyKey: `starter-identity-b-${randomUUID()}` }),
    ])
    assert.equal(identityRace.filter((item) => item.status === 'fulfilled' && item.value.grant).length, 1)
    assert.equal(await prisma.starterBenefitGrant.count({ where: { organizationId: { in: [identityOrganizationA.id, identityOrganizationB.id] } } }), 1)
    assert.equal(await prisma.creditTransaction.count({ where: { referenceType: 'StarterBenefitGrant', creditAccount: { organizationId: { in: [identityOrganizationA.id, identityOrganizationB.id] } } } }), 1)

    const v2Purchase = await prisma.financialPurchase.create({ data: {
      organizationId: organization.id, createdByUserId: user.id, status: 'PAID', kind: 'CREDIT_PACKAGE', packageSku: 'CREDITS_100',
      packageLabel: '100 credits', credits: 100, baseAmountCents: 10_000, packageDiscountCents: 500,
      amountExclVatCents: 9_500, vatRateBps: 2_100, vatAmountCents: 1_995, amountInclVatCents: 11_495,
      currency: 'EUR', billingOrganizationName: organization.name, billingAddressLine: 'Een zeer lange teststraatnaam 123 toevoeging',
      billingPostalCode: '9405 LC', billingCity: 'Assen', billingCountryCode: 'NL', molliePaymentId: `tr_v2_${randomUUID()}`,
      idempotencyKey: `finance-v2-${randomUUID()}`, paidAt: new Date('2026-08-24T09:00:00Z'), terminalAt: new Date('2026-08-24T09:00:00Z'),
    } })
    const v2InvoiceId = randomUUID()
    await prisma.$transaction(async (transaction) => {
      await transaction.financialInvoice.create({ data: {
        id: v2InvoiceId, snapshotVersion: 2, invoiceNumber: `WM-V2-${randomUUID()}`.slice(0, 40), sequenceNumber: 900_001,
        purchaseId: v2Purchase.id, organizationId: organization.id, issuedAt: new Date('2026-08-24T09:01:00Z'), supplyDate: new Date('2026-08-24T09:00:30Z'),
        sellerLegalName: 'Feenstra Safety Consulting', sellerTradeName: 'WorkMatchr', sellerAddressLine: 'Kennemerland 71', sellerPostalCode: '9405 LC', sellerCity: 'Assen', sellerCountryCode: 'NL', sellerKvKNumber: '57788863', sellerVatId: 'NL002107278B11',
        customerOrganizationName: organization.name, customerAddressLine: 'Een zeer lange teststraatnaam 123 toevoeging', customerPostalCode: '9405 LC', customerCity: 'Assen', customerCountryCode: 'NL',
        packageSku: 'CREDITS_100', packageLabel: '100 credits', credits: 100, baseAmountCents: 10_000, packageDiscountCents: 500, proDiscountCents: 0, discountCodeDiscountCents: 0,
        amountExclVatCents: 9_500, vatRateBps: 2_100, vatAmountCents: 1_995, amountInclVatCents: 11_495, currency: 'EUR', molliePaymentId: v2Purchase.molliePaymentId,
      } })
      await transaction.financialInvoiceLine.create({ data: { invoiceId: v2InvoiceId, position: 1, description: '100 WorkMatchr credits', quantity: 100, unit: 'credit', unitPriceExclVatCents: 100, grossAmountExclVatCents: 10_000, discountAmountCents: 500, netAmountExclVatCents: 9_500, vatRateBps: 2_100, vatAmountCents: 1_995, amountInclVatCents: 11_495 } })
      await transaction.financialInvoiceVatSummary.create({ data: { invoiceId: v2InvoiceId, vatRateBps: 2_100, taxableAmountExclVatCents: 9_500, vatAmountCents: 1_995, amountInclVatCents: 11_495 } })
    })
    const v2Invoice = await prisma.financialInvoice.findUniqueOrThrow({ where: { id: v2InvoiceId }, include: { lines: true, vatSummaries: true } })
    assert.equal(v2Invoice.snapshotVersion, 2)
    assert.equal(v2Invoice.lines.length, 1)
    assert.equal(v2Invoice.vatSummaries.length, 1)
    await assert.rejects(prisma.financialInvoiceLine.update({ where: { id: v2Invoice.lines[0]!.id }, data: { description: 'Niet toegestaan' } }))

    const incompletePurchase = await prisma.financialPurchase.create({ data: {
      organizationId: organization.id, createdByUserId: user.id, status: 'PAID', packageSku: 'CREDITS_25', packageLabel: '25 credits', credits: 25,
      baseAmountCents: 2_500, amountExclVatCents: 2_500, vatRateBps: 2_100, vatAmountCents: 525, amountInclVatCents: 3_025, currency: 'EUR',
      billingOrganizationName: organization.name, billingAddressLine: 'Teststraat 1', billingPostalCode: '9405 LC', billingCity: 'Assen', billingCountryCode: 'NL',
      molliePaymentId: `tr_incomplete_${randomUUID()}`, idempotencyKey: `finance-v2-incomplete-${randomUUID()}`, paidAt: new Date(), terminalAt: new Date(),
    } })
    await assert.rejects(prisma.$transaction((transaction) => transaction.financialInvoice.create({ data: {
      snapshotVersion: 2, invoiceNumber: `WM-BAD-${randomUUID()}`.slice(0, 40), sequenceNumber: 900_002, purchaseId: incompletePurchase.id,
      organizationId: organization.id, issuedAt: new Date(), supplyDate: new Date(), sellerLegalName: 'Feenstra Safety Consulting', sellerTradeName: 'WorkMatchr',
      sellerAddressLine: 'Kennemerland 71', sellerPostalCode: '9405 LC', sellerCity: 'Assen', sellerCountryCode: 'NL', sellerKvKNumber: '57788863', sellerVatId: 'NL002107278B11',
      customerOrganizationName: organization.name, customerAddressLine: 'Teststraat 1', customerPostalCode: '9405 LC', customerCity: 'Assen', customerCountryCode: 'NL',
      packageSku: 'CREDITS_25', packageLabel: '25 credits', credits: 25, baseAmountCents: 2_500, packageDiscountCents: 0, proDiscountCents: 0, discountCodeDiscountCents: 0, amountExclVatCents: 2_500,
      vatRateBps: 2_100, vatAmountCents: 525, amountInclVatCents: 3_025, currency: 'EUR', molliePaymentId: incompletePurchase.molliePaymentId,
    } })))
    assert.equal(await prisma.financialInvoice.count({ where: { purchaseId: incompletePurchase.id } }), 0)
    console.log('FinancialInvoice snapshot v2 totaliteit, rollback en immutability zijn geslaagd.')
    console.log('Kortingscode- en startersvoordeelconcurrency zijn transactioneel geslaagd.')
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende financiële databasetestfout.')
  process.exitCode = 1
})
