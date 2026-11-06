import 'server-only'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { lockAcademyCommerce } from './academy-commerce-access'
import { commerceAssert } from './academy-commerce-policy'
import { withdrawalInput } from './academy-withdrawal-policy'
import { createHash } from 'node:crypto'

/** No order existence/status/details are returned to an unauthenticated requester. */
export async function receiveAcademyWithdrawal(raw: unknown) {
  assertAcademyCommerceSandbox()
  const input = withdrawalInput.parse(raw)
  return runSerializableFinancialTransaction(async tx => {
    await lockAcademyCommerce(tx, 'public-withdrawal')
    const previous = await tx.academyWithdrawalRequest.findUnique({ where: { requestKey: input.requestKey } })
    if (previous) {
      commerceAssert(previous.email === input.email && previous.orderReference === input.orderReference, 'WITHDRAWAL_REQUEST_CONFLICT')
      return { reference: previous.id, receivedAt: previous.receivedAt.toISOString() }
    }
    const since = new Date(Date.now() - 60000)
    const [global, personal] = await Promise.all([
      tx.academyWithdrawalRequest.count({ where: { receivedAt: { gt: since } } }),
      tx.academyWithdrawalRequest.count({ where: { email: input.email, receivedAt: { gt: since } } }),
    ])
    commerceAssert(global < 50 && personal < 3, 'WITHDRAWAL_RATE_LIMIT')
    const receipt = await tx.academyWithdrawalRequest.create({ data: { requestKey: input.requestKey, orderReference: input.orderReference, email: input.email, declarationVersion: input.declarationVersion } })
    await tx.notificationOutbox.create({ data: {
      eventId: `ACADEMY_PUBLIC_WITHDRAWAL:${receipt.id}`, channel: 'EMAIL', templateKey: 'ACADEMY_PUBLIC_WITHDRAWAL',
      payload: { withdrawalId: receipt.id }, idempotencyKey: `academy-public-withdrawal:${receipt.id}`,
    } })
    // Matching is private and never changes money, access, certificates or agreements.
    await tx.financialEvent.create({ data: { eventType: 'ACADEMY_WITHDRAWAL_DECLARATION_RECEIVED', result: 'RECEIVED',
      idempotencyKey: `academy-public-declaration:${receipt.id}`, metadata: { receiptId: receipt.id, declarationVersion: receipt.declarationVersion, requestFingerprint: createHash('sha256').update(JSON.stringify(input)).digest('hex') },
    } })
    return { reference: receipt.id, receivedAt: receipt.receivedAt.toISOString() }
  })
}
