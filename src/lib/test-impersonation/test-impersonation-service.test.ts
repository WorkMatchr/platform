import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  authorize: vi.fn(),
  userFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  sessionUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./test-impersonation-context', () => ({
  getCurrentAuthenticationContext: mocks.context,
}))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({
  getPlatformAdministratorContext: mocks.authorize,
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    user: {
      findMany: mocks.userFindMany,
      findUnique: mocks.userFindUnique,
    },
    session: { updateMany: mocks.sessionUpdateMany },
    adminActionLog: { create: mocks.auditCreate },
    $transaction: mocks.transaction,
  }),
}))

import {
  getAvailableTestAccounts,
  startTestImpersonation,
  stopTestImpersonation,
} from './test-impersonation-service'

const actorUserId = '11111111-1111-4111-8111-111111111111'
const targetUserId = '22222222-2222-4222-8222-222222222222'
const sessionId = '33333333-3333-4333-8333-333333333333'
const organizationId = '44444444-4444-4444-8444-444444444444'

function activeContext(impersonating = false) {
  return {
    actorUser: {
      id: actorUserId,
      email: 'platformbeheer@example.invalid',
      displayName: 'Platformbeheerder',
      emailVerified: true,
      platformRole: 'ADMIN',
      status: 'ACTIVE',
    },
    effectiveUser: {
      id: impersonating ? targetUserId : actorUserId,
      email: impersonating ? 'eigenaar@test-wm.example.invalid' : 'platformbeheer@example.invalid',
      displayName: impersonating ? 'Testeigenaar' : 'Platformbeheerder',
      emailVerified: true,
      platformRole: impersonating ? 'USER' : 'ADMIN',
      status: 'ACTIVE',
    },
    sessionId,
    impersonation: impersonating
      ? {
          effectiveUserId: targetUserId,
          startedAt: new Date('2026-07-31T09:00:00Z'),
          valid: true,
        }
      : null,
  }
}

const target = {
  id: targetUserId,
  email: 'eigenaar@test-wm.example.invalid',
  emailVerified: true,
  status: 'ACTIVE',
  platformRole: 'USER',
  displayName: 'Testeigenaar',
  memberships: [
    {
      status: 'ACTIVE',
      role: 'OWNER',
      organization: {
        id: organizationId,
        name: 'TEST-WM-Delta Veiligheidsadvies',
        organizationType: 'PROVIDER',
        status: 'ACTIVE',
        systemKey: null,
      },
    },
  ],
  providerPermissionSubjects: [],
}

describe('testaccountwisselaarservice', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('ENABLE_TEST_ACCOUNT_SWITCHER', 'true')
    vi.clearAllMocks()
    mocks.context.mockResolvedValue(activeContext())
    mocks.authorize.mockResolvedValue({ id: actorUserId })
    mocks.userFindUnique.mockResolvedValue(target)
    mocks.sessionUpdateMany.mockResolvedValue({ count: 1 })
    mocks.auditCreate.mockResolvedValue({ id: 'audit-id' })
    mocks.transaction.mockImplementation(async (operation) =>
      operation({
        user: { findUnique: mocks.userFindUnique },
        session: { updateMany: mocks.sessionUpdateMany },
        adminActionLog: { create: mocks.auditCreate },
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('toont alleen actieve, geverifieerde en herkenbare testaccounts', async () => {
    mocks.userFindMany.mockResolvedValue([
      target,
      { ...target, id: 'real', email: 'persoon@workmatchr.nl' },
      { ...target, id: 'blocked', status: 'BLOCKED' },
    ])

    await expect(getAvailableTestAccounts()).resolves.toEqual([
      expect.objectContaining({
        id: targetUserId,
        organizationName: 'TEST-WM-Delta Veiligheidsadvies',
        organizationRole: 'OWNER',
        accountStatus: 'ACTIVE',
        destination: '/professional/opdrachten',
      }),
    ])
  })

  it('start de wisseling en audit actor en effectieve gebruiker atomair', async () => {
    await expect(startTestImpersonation(targetUserId)).resolves.toEqual({
      destination: '/professional/opdrachten',
    })

    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: sessionId,
        userId: actorUserId,
        impersonatedUserId: null,
      }),
      data: {
        impersonatedUserId: targetUserId,
        impersonationStartedAt: expect.any(Date),
      },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId,
        action: 'TEST_IMPERSONATION_STARTED',
        entityId: targetUserId,
        metadata: expect.objectContaining({
          sessionId,
          effectiveUserId: targetUserId,
          organizationId,
        }),
      }),
    })
  })

  it('stopt de wisseling en herstelt de actorsessie atomair', async () => {
    mocks.context.mockResolvedValue(activeContext(true))

    await stopTestImpersonation()

    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: sessionId,
        userId: actorUserId,
        impersonatedUserId: targetUserId,
      }),
      data: {
        impersonatedUserId: null,
        impersonationStartedAt: null,
      },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId,
        action: 'TEST_IMPERSONATION_STOPPED',
        entityId: targetUserId,
        metadata: expect.objectContaining({
          startedAt: '2026-07-31T09:00:00.000Z',
          endedAt: expect.any(String),
        }),
      }),
    })
  })

  it('weigert geneste wisselingen zonder sessiemutatie', async () => {
    mocks.context.mockResolvedValue(activeContext(true))

    await expect(startTestImpersonation(targetUserId)).rejects.toMatchObject({
      code: 'ALREADY_ACTIVE',
    })
    expect(mocks.sessionUpdateMany).not.toHaveBeenCalled()
  })

  it('weigert een race wanneer de actorsessie intussen veranderde', async () => {
    mocks.sessionUpdateMany.mockResolvedValue({ count: 0 })

    await expect(startTestImpersonation(targetUserId)).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('weigert een onbekend account-ID zonder sessiemutatie', async () => {
    mocks.userFindUnique.mockResolvedValue(null)

    await expect(startTestImpersonation(targetUserId)).rejects.toMatchObject({
      code: 'TARGET_NOT_AVAILABLE',
    })
    expect(mocks.sessionUpdateMany).not.toHaveBeenCalled()
  })

  it('weigert een account met een niet-actieve tenantcontext', async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...target,
      memberships: [
        {
          ...target.memberships[0],
          status: 'SUSPENDED',
        },
      ],
    })

    await expect(startTestImpersonation(targetUserId)).rejects.toMatchObject({
      code: 'TARGET_NOT_AVAILABLE',
    })
    expect(mocks.sessionUpdateMany).not.toHaveBeenCalled()
  })

  it('is in productie hard uitgeschakeld, ook met een feature flag', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await expect(startTestImpersonation(targetUserId)).rejects.toMatchObject({
      code: 'DISABLED',
    })
    expect(mocks.context).not.toHaveBeenCalled()
    expect(mocks.sessionUpdateMany).not.toHaveBeenCalled()
  })

  it('weigert een gewone gebruiker vóórdat testaccounts worden gelezen', async () => {
    mocks.authorize.mockRejectedValue(new Error('geen platformbeheerder'))

    await expect(getAvailableTestAccounts()).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    })
    expect(mocks.userFindMany).not.toHaveBeenCalled()
  })
})
