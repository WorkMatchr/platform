import type { Prisma } from '@/generated/prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { appendTwoFactorAuditEvent } from './auth-two-factor-audit'

function transactionMock() {
  return {
    accountProvisioningEvent: { findUnique: vi.fn(), create: vi.fn() },
  } as unknown as Pick<Prisma.TransactionClient, 'accountProvisioningEvent'>
}

describe('two-factor audit foundation', () => {
  it('records only safe metadata for enrollment and never accepts factor material', async () => {
    const transaction = transactionMock()
    vi.mocked(transaction.accountProvisioningEvent.findUnique).mockResolvedValue(null)
    vi.mocked(transaction.accountProvisioningEvent.create).mockResolvedValue({ id: 'event-1' } as never)

    await appendTwoFactorAuditEvent(transaction, {
      eventType: 'TWO_FACTOR_ENROLLED',
      subjectUserId: 'user-1',
      actorUserId: 'user-1',
      reasonCode: 'SELF_SERVICE_ENROLLMENT',
      correlationId: 'correlation-1',
      idempotencyKey: 'two-factor:user-1:enrolled',
    })

    expect(transaction.accountProvisioningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'TWO_FACTOR_ENROLLED',
        subjectUserId: 'user-1',
        metadata: { policyVersion: 'TWO_FACTOR_AUDIT_V1' },
      }),
    })

    const serializedInput = JSON.stringify(
      vi.mocked(transaction.accountProvisioningEvent.create).mock.calls[0]?.[0],
    )
    expect(serializedInput).not.toMatch(/secret|backup|recovery|password|token|session|otpauth/i)
  })
})
