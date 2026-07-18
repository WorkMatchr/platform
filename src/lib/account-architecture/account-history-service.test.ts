import type { Prisma } from '@/generated/prisma/client'
import { describe, expect, it, vi } from 'vitest'
import {
  AccountHistoryValidationError,
  appendAccountProvisioningEvent,
  appendOrganizationMembershipEvent,
  appendOrganizationProvisioningEvent,
  assertSafeAccountHistoryMetadata,
} from './account-history-service'

function transactionMock() {
  return {
    accountProvisioningEvent: { findUnique: vi.fn(), create: vi.fn() },
    organizationMembershipEvent: { findUnique: vi.fn(), create: vi.fn() },
    organizationProvisioningEvent: { findUnique: vi.fn(), create: vi.fn() },
  } as unknown as Pick<Prisma.TransactionClient, 'accountProvisioningEvent' | 'organizationMembershipEvent' | 'organizationProvisioningEvent'>
}

describe('append-only accounthistorie', () => {
  it('weigert secrets, tokens en persoonsgegevens in metadata', () => {
    expect(() => assertSafeAccountHistoryMetadata({ context: { accessToken: 'verboden' } })).toThrow(
      AccountHistoryValidationError,
    )
    expect(() => assertSafeAccountHistoryMetadata({ contactEmail: 'verboden@example.invalid' })).toThrow(
      AccountHistoryValidationError,
    )
  })

  it('schrijft uitsluitend een nieuw provisioningevent', async () => {
    const transaction = transactionMock()
    vi.mocked(transaction.accountProvisioningEvent.findUnique).mockResolvedValue(null)
    vi.mocked(transaction.accountProvisioningEvent.create).mockResolvedValue({ id: 'event-1' } as never)

    await expect(
      appendAccountProvisioningEvent(transaction, {
        eventType: 'MIGRATED_UNKNOWN',
        subjectUserId: 'user-1',
        reasonCode: 'LEGACY_ACTOR_UNKNOWN',
        idempotencyKey: 'migration:user-1',
        metadata: { source: 'ADR_013_PHASE_1' },
      }),
    ).resolves.toMatchObject({ id: 'event-1' })
    expect(transaction.accountProvisioningEvent.create).toHaveBeenCalledOnce()
  })

  it('geeft een bestaand identiek event terug zonder update', async () => {
    const transaction = transactionMock()
    vi.mocked(transaction.accountProvisioningEvent.findUnique).mockResolvedValue({
      id: 'event-1',
      eventType: 'ACCOUNT_CREATED',
      subjectUserId: 'user-1',
    } as never)

    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_CREATED',
      subjectUserId: 'user-1',
      idempotencyKey: 'create:user-1',
    })
    expect(transaction.accountProvisioningEvent.create).not.toHaveBeenCalled()
  })

  it('weigert hergebruik van een idempotency key voor een ander event', async () => {
    const transaction = transactionMock()
    vi.mocked(transaction.organizationMembershipEvent.findUnique).mockResolvedValue({
      eventType: 'ROLE_CHANGED',
      membershipId: 'membership-2',
    } as never)

    await expect(
      appendOrganizationMembershipEvent(transaction, {
        eventType: 'STATUS_CHANGED',
        membershipId: 'membership-1',
        userId: 'user-1',
        organizationId: 'organization-1',
        reasonCode: 'STATUS_CHANGED',
        idempotencyKey: 'membership:event-1',
      }),
    ).rejects.toThrow(AccountHistoryValidationError)
  })

  it('schrijft een systeemgedreven organisatieevent idempotent zonder fictieve User-actor', async () => {
    const transaction = transactionMock()
    vi.mocked(transaction.organizationProvisioningEvent.findUnique).mockResolvedValue(null)
    vi.mocked(transaction.organizationProvisioningEvent.create).mockResolvedValue({ id: 'organization-event-1' } as never)

    await appendOrganizationProvisioningEvent(transaction, {
      eventType: 'ORGANIZATION_BOOTSTRAPPED',
      organizationId: 'organization-1',
      actorType: 'SYSTEM',
      actorUserId: null,
      reasonCode: 'PLATFORM_ORGANIZATION_BOOTSTRAPPED',
      idempotencyKey: 'phase2a:platform:bootstrapped',
      metadata: { migrationVersion: 'ADR013_PHASE2A_V1' },
    })

    expect(transaction.organizationProvisioningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorType: 'SYSTEM', actorUserId: null }),
    })
  })

  it('weigert een USER-actor zonder actorUserId', async () => {
    const transaction = transactionMock()
    await expect(appendOrganizationProvisioningEvent(transaction, {
      eventType: 'GOVERNANCE_ACTIVATED', organizationId: 'organization-1', actorType: 'USER',
      actorUserId: null, reasonCode: 'INVALID', idempotencyKey: 'phase2a:invalid',
    })).rejects.toThrow(AccountHistoryValidationError)
  })
})
