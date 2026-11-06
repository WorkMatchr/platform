import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Client } from 'pg'

// Only called after the isolated migration harness creates a new database and
// applies its 85-file baseline. Deliberately uses that schema, not the current
// Prisma client, and contains no production identities or provider calls.
export async function seedFinancialRecoveryBaseline85(db: Client) {
  const identity = (await db.query('SELECT current_database() AS name')).rows[0].name
  assert.match(identity, /^workmatchr_db02_production-upgrade_\d+_\d+$/)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM _prisma_migrations')).rows[0].n, 85)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "FinancialPurchase"')).rows[0].n, 0)
  const insert = async (table: string, values: Record<string, unknown>) => {
    assert.match(table, /^[A-Za-z]+$/)
    const columns = Object.keys(values)
    for (const column of columns) assert.match(column, /^[A-Za-z]+$/)
    try {
      await db.query(`INSERT INTO "${table}" (${columns.map(column => `"${column}"`).join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(values))
    } catch (error) {
      assert.fail(`Synthetic fixture insert failed: ${table} / ${(error as { code?: string }).code ?? 'UNKNOWN'}`)
    }
  }
  const at = new Date('2026-09-01T12:00:00Z')
  const money = { amountExclVatCents: 4900, vatRateBps: 2100, vatAmountCents: 1029, amountInclVatCents: 5929, currency: 'EUR' }
  const discount = { packageDiscountCents: 0, proDiscountCents: 0, discountCodeDiscountCents: 0 }
  const user = randomUUID(), organization = randomUUID(), subscription = randomUUID()
  await insert('User', { id: user, email: `${user}@example.invalid`, displayName: 'Synthetic Recovery', accountType: 'PROFESSIONAL', status: 'ACTIVE', updatedAt: at })
  await insert('Organization', { id: organization, name: 'Synthetic Recovery Organization', organizationType: 'PROVIDER', status: 'ACTIVE', updatedAt: at })
  await insert('OrganizationMembership', { id: randomUUID(), userId: user, organizationId: organization, role: 'OWNER', status: 'ACTIVE', updatedAt: at })
  const basePurchase = {
    organizationId: organization, createdByUserId: user, kind: 'PRO_SUBSCRIPTION',
    packageSku: 'WORKMATCHR_PRO', packageLabel: 'Synthetic Pro', credits: 0,
    baseAmountCents: 4900, ...discount, ...money,
    billingOrganizationName: 'Synthetic Recovery Organization', billingAddressLine: 'Teststraat 1',
    billingPostalCode: '1000 AA', billingCity: 'Testplaats', billingCountryCode: 'NL', updatedAt: at,
  }
  const expired = randomUUID(), paid = randomUUID(), credits = randomUUID(), wallet = randomUUID(), ledger = randomUUID()
  await insert('FinancialPurchase', { ...basePurchase, id: expired, status: 'EXPIRED', molliePaymentId: 'tr_synthetic_expired', idempotencyKey: randomUUID(), terminalAt: at })
  await insert('FinancialPurchase', { ...basePurchase, id: paid, status: 'PAID', molliePaymentId: 'tr_synthetic_initial', idempotencyKey: randomUUID(), paidAt: at, terminalAt: at })
  await insert('ProfessionalSubscription', {
    id: subscription, organizationId: organization, status: 'ACTIVE', planCode: 'WORKMATCHR_PRO', planLabel: 'Synthetic Pro', ...money,
    mollieCustomerId: 'cst_synthetic_recovery', mollieSubscriptionId: 'sub_synthetic_recovery', firstPaymentPurchaseId: expired,
    currentPeriodStart: new Date('2026-11-01T12:00:00Z'), currentPeriodEnd: new Date('2026-12-01T12:00:00Z'), updatedAt: at,
  })
  await insert('ProfessionalSubscriptionFirstPaymentAttempt', { id: randomUUID(), subscriptionId: subscription, purchaseId: paid, attemptNumber: 1 })
  await insert('CreditAccount', { id: wallet, organizationId: organization, balance: 0, availableBalance: 0, reservedBalance: 0, spentBalance: 0, updatedAt: at })
  await insert('CreditTransaction', {
    id: ledger, creditAccountId: wallet, type: 'PURCHASE', amount: 25, totalDelta: 25, reservedDelta: 0,
    balanceBefore: 0, balanceAfter: 25, availableBefore: 0, availableAfter: 25, reservedBefore: 0, reservedAfter: 0,
    spentBefore: 0, spentAfter: 0, reason: 'Synthetic recovery fixture', referenceType: 'FINANCIAL_PURCHASE', referenceId: credits, idempotencyKey: randomUUID(), createdByUserId: user,
  })
  await insert('FinancialPurchase', {
    ...basePurchase, id: credits, status: 'PAID', kind: 'CREDIT_PACKAGE', credits: 25, packageSku: 'SYNTHETIC_25',
    packageLabel: 'Synthetic 25 credits', baseAmountCents: 2500, amountExclVatCents: 2500, vatAmountCents: 525, amountInclVatCents: 3025,
    molliePaymentId: 'tr_synthetic_credits', creditedTransactionId: ledger, idempotencyKey: randomUUID(), paidAt: at, terminalAt: at,
  })
  const sources: Array<{ purchaseId?: string; subscriptionPaymentId?: string; molliePaymentId: string; isCredits?: boolean }> = [
    { purchaseId: paid, molliePaymentId: 'tr_synthetic_initial' }, { purchaseId: credits, molliePaymentId: 'tr_synthetic_credits', isCredits: true },
  ]
  for (const month of [10, 11]) {
    const id = randomUUID(), payment = `tr_synthetic_renewal_${month}`
    await insert('ProfessionalSubscriptionPayment', {
      id, subscriptionId: subscription, molliePaymentId: payment, status: 'PAID', ...money,
      periodStart: new Date(`2026-${month}-01T12:00:00Z`), periodEnd: new Date(`2026-${month + 1}-01T12:00:00Z`),
      payloadFingerprint: '0'.repeat(64), idempotencyKey: randomUUID(),
    })
    sources.push({ subscriptionPaymentId: id, molliePaymentId: payment })
  }
  for (const [i, source] of sources.entries()) {
    const invoice = randomUUID(), sync = randomUUID()
    const { isCredits, ...link } = source
    await insert('FinancialInvoice', {
      id: invoice, invoiceNumber: `SYNTHETIC-${i + 1}`, sequenceNumber: i + 1, ...link,
      organizationId: organization, issuedAt: at, snapshotVersion: 1,
      sellerLegalName: 'Synthetic Seller', sellerTradeName: 'Synthetic Seller', sellerAddressLine: 'Teststraat 2', sellerPostalCode: '1000 AA',
      sellerCity: 'Testplaats', sellerCountryCode: 'NL', sellerKvKNumber: '00000000', sellerVatId: 'NL000000000B00',
      customerOrganizationName: 'Synthetic Recovery Organization', customerAddressLine: 'Teststraat 1', customerPostalCode: '1000 AA',
      customerCity: 'Testplaats', customerCountryCode: 'NL', packageSku: isCredits ? 'SYNTHETIC_25' : 'WORKMATCHR_PRO',
      packageLabel: isCredits ? 'Synthetic 25 credits' : 'Synthetic Pro', credits: isCredits ? 25 : 0,
      baseAmountCents: isCredits ? 2500 : 4900, ...discount, ...money,
      ...(isCredits ? { amountExclVatCents: 2500, vatAmountCents: 525, amountInclVatCents: 3025 } : {}),
    })
    const status = i === 3 ? 'FAILED' : 'SYNCED'
    await insert('FinancialJorttSync', { id: sync, invoiceId: invoice, status, externalReference: `synthetic-document-${i}`, attemptCount: 1,
      lastErrorCode: status === 'FAILED' ? 'SYNTHETIC_PROVIDER_ERROR' : null, syncedAt: status === 'SYNCED' ? at : null, updatedAt: at })
    await insert('FinancialJorttSyncAttempt', { id: randomUUID(), syncId: sync, attemptNumber: 1, status, idempotencyKey: randomUUID() })
    await insert('FinancialEvent', { id: randomUUID(), actorUserId: user, invoiceId: invoice, eventType: 'SYNTHETIC_HISTORICAL_INVOICE', result: 'RECORDED', idempotencyKey: randomUUID() })
  }
  await insert('FinancialInvoiceCounter', { id: 1, nextNumber: 5, updatedAt: at })
  const expected = { FinancialPurchase: 3, ProfessionalSubscription: 1, ProfessionalSubscriptionPayment: 2,
    FinancialInvoice: 4, CreditTransaction: 1, CreditAccount: 1, FinancialJorttSync: 4, FinancialJorttSyncAttempt: 4, FinancialEvent: 4 }
  for (const [table, n] of Object.entries(expected)) {
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n, n, `Missing synthetic history: ${table}`)
  }
  console.log('P1.2 BASELINE PASS: expired first attempt, paid retry, two renewals, credit wallet/ledger, four immutable invoices, synced/failed Jortt history and financial audit')
}
