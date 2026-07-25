import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), queryRaw: vi.fn(), findUnique: vi.fn(), update: vi.fn(), auditCreate: vi.fn(), transaction: vi.fn(),
}))
vi.mock('./platform-admin-authorization', () => ({ getPlatformAdministratorContext: mocks.authorize }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))

import { PlatformOrganizationLifecycleError, setPlatformOrganizationBlocked } from './platform-organization-lifecycle-service'

const transaction = {
  $queryRaw: mocks.queryRaw,
  organization: { findUnique: mocks.findUnique, update: mocks.update },
  adminActionLog: { create: mocks.auditCreate },
}

describe('platformorganisatie-lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ id: 'admin-1' })
    mocks.transaction.mockImplementation(async (callback) => callback(transaction))
    mocks.findUnique.mockResolvedValue({ id: 'organization-1', status: 'ACTIVE', systemKey: null })
    mocks.update.mockResolvedValue({})
    mocks.auditCreate.mockResolvedValue({})
  })

  it('blokkeert status en audit atomair na platformautorisatie', async () => {
    await expect(setPlatformOrganizationBlocked({
      actorUserId: 'admin-1', organizationId: 'organization-1', blocked: true, reason: 'Handmatige risicobeoordeling',
    })).resolves.toEqual({ outcome: 'BLOCKED' })
    expect(mocks.authorize).toHaveBeenCalledWith('admin-1')
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'organization-1' }, data: { status: 'SUSPENDED' } })
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_BLOCKED', actorUserId: 'admin-1' }) })
  })

  it('weigert de beschermde platformorganisatie', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'platform-1', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' })
    await expect(setPlatformOrganizationBlocked({
      actorUserId: 'admin-1', organizationId: 'platform-1', blocked: true, reason: 'Niet toegestaan',
    })).rejects.toBeInstanceOf(PlatformOrganizationLifecycleError)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
