import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/generated/prisma/client'
import {
  FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET,
  ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET,
  FirstPlatformOwnerBootstrapPolicyError,
} from './first-platform-owner-bootstrap-policy'

const shared = vi.hoisted(() => ({
  organization: { id: 'platform-org', name: 'WorkMatchr Platform', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE', archivedAt: null } as null | Record<string, unknown>,
  ownerCount: 0,
  marker: false,
  eligible: true,
  appendMembership: vi.fn(),
  appendAccount: vi.fn(),
  appendOrganization: vi.fn(),
  findOrganization: vi.fn(),
  ensureOrganization: vi.fn(),
}))

vi.mock('./account-history-service', () => ({
  appendAccountProvisioningEvent: shared.appendAccount,
  appendOrganizationMembershipEvent: shared.appendMembership,
  appendOrganizationProvisioningEvent: shared.appendOrganization,
}))

vi.mock('./platform-organization-service', () => ({
  findPlatformOrganization: shared.findOrganization,
  ensurePlatformOrganization: shared.ensureOrganization,
}))

import {
  executeFirstPlatformOwnerBootstrap,
  inspectFirstPlatformOwnerBootstrap,
} from './first-platform-owner-bootstrap-service'

const userId = '9ed991ab-bcc8-43be-94d6-2d610fa0a503'
const input = { userId, operatorReference: 'SEC-BOOTSTRAP-001' }

function mockPrisma() {
  const state = { ownerCount: shared.ownerCount, marker: shared.marker }
  const transaction = {
    $queryRaw: vi.fn(async () => []),
    organizationMembership: {
      count: vi.fn(async () => state.ownerCount),
      create: vi.fn(async () => {
        state.ownerCount += 1
        return { id: 'membership-1' }
      }),
    },
    organizationMembershipEvent: {
      findUnique: vi.fn(async () => state.marker ? { id: 'membership-event' } : null),
    },
    organizationProvisioningEvent: { findUnique: vi.fn(async () => null) },
    accountProvisioningEvent: { findUnique: vi.fn(async () => null) },
    user: {
      findFirst: vi.fn(async () => shared.eligible ? { id: userId } : null),
      updateMany: vi.fn(async (input: { data: Record<string, unknown> }) => {
        void input
        return { count: 1 }
      }),
    },
    session: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  }
  const prisma = {
    $queryRaw: vi.fn(async () => [{ databaseName: 'neondb', serverVersionNum: 170011 }]),
    organizationMembership: transaction.organizationMembership,
    organizationMembershipEvent: transaction.organizationMembershipEvent,
    organization: {},
    user: transaction.user,
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
  }
  return { prisma: prisma as unknown as PrismaClient, transaction, state }
}

describe('first-platform-owner bootstrap service', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('ACADEMY_TEST_PROJECT_ID', '')
    vi.stubEnv('ACADEMY_TEST_BRANCH_ID', '')
    vi.stubEnv('WL001_TEST_NEON_PROJECT_ID', FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.projectId)
    vi.stubEnv('WL001_TEST_NEON_BRANCH_ID', FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.branchId)
    vi.stubEnv('DATABASE_URL', `postgresql://test:placeholder@${FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}/neondb?sslmode=require`)
    shared.organization = { id: 'platform-org', name: 'WorkMatchr Platform', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE', archivedAt: null }
    shared.ownerCount = 0
    shared.marker = false
    shared.eligible = true
    shared.appendMembership.mockReset()
    shared.appendAccount.mockReset()
    shared.appendOrganization.mockReset()
    shared.findOrganization.mockImplementation(async () => shared.organization)
    shared.ensureOrganization.mockImplementation(async () => {
      shared.organization = { id: 'platform-org-new', name: 'WorkMatchr Platform', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE', archivedAt: null }
      return shared.organization
    })
    shared.appendMembership.mockImplementation(async (_tx, event) => {
      if (event.idempotencyKey === 'workmatchr:first-platform-owner:v1:membership') shared.marker = true
      return { id: 'membership-event' }
    })
  })

  afterEach(() => vi.unstubAllEnvs())

  it('dry-run blijft read-only en rapporteert een ontbrekende identiteit als blocker', async () => {
    shared.eligible = false
    const { prisma } = mockPrisma()
    const report = await inspectFirstPlatformOwnerBootstrap(prisma, input)
    expect(report.mode).toBe('dry-run')
    expect(report.blockers).toContain('De aangewezen persoon heeft geen actief, geverifieerd Better Auth-testaccount onder example.invalid zonder membership.')
    expect(shared.ensureOrganization).not.toHaveBeenCalled()
    expect(shared.appendMembership).not.toHaveBeenCalled()
  })

  it('weigert uitvoering wanneer de aangewezen Better Auth-identiteit ontbreekt of niet eligible is', async () => {
    shared.eligible = false
    const { prisma } = mockPrisma()
    await expect(executeFirstPlatformOwnerBootstrap(prisma, input)).rejects.toMatchObject({
      code: 'IDENTITY_NOT_ELIGIBLE',
    })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('weigert wanneer al een eigenaar bestaat', async () => {
    shared.ownerCount = 1
    const { prisma } = mockPrisma()
    await expect(executeFirstPlatformOwnerBootstrap(prisma, input)).rejects.toMatchObject({ code: 'OWNER_ALREADY_EXISTS' })
  })

  it('ondersteunt Academy met dezelfde eigenaartransactie en audit, zonder aanmelding of voorwaardenmutatie', async () => {
    vi.stubEnv('WL001_TEST_NEON_PROJECT_ID', '')
    vi.stubEnv('WL001_TEST_NEON_BRANCH_ID', '')
    vi.stubEnv('ACADEMY_TEST_PROJECT_ID', ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.projectId)
    vi.stubEnv('ACADEMY_TEST_BRANCH_ID', ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.branchId)
    vi.stubEnv('DATABASE_URL', `postgresql://test:placeholder@${ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}/neondb?sslmode=verify-full`)
    const { prisma, transaction } = mockPrisma()
    await executeFirstPlatformOwnerBootstrap(prisma, input)
    expect(transaction.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{platformRole:'ADMIN'}}))
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {isolationLevel:'Serializable',timeout:15000})
    expect(shared.appendMembership).toHaveBeenCalledOnce()
    expect(shared.appendAccount).toHaveBeenCalledOnce()
    expect(shared.ensureOrganization).not.toHaveBeenCalled()
  })

  it('weigert een client met verkeerde database-identiteit vóór enige eigenaartransactie', async () => {
    const { prisma } = mockPrisma()
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{databaseName:'other',serverVersionNum:170011}])
    await expect(executeFirstPlatformOwnerBootstrap(prisma,input)).rejects.toBeInstanceOf(FirstPlatformOwnerBootstrapPolicyError)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(shared.ensureOrganization).not.toHaveBeenCalled()
  })

  it('hergebruikt de bestaande organisatieservice alleen wanneer de centrale organisatie ontbreekt', async () => {
    shared.organization=null
    const {prisma}=mockPrisma()
    expect((await inspectFirstPlatformOwnerBootstrap(prisma,input)).platformOrganization).toBe('WOULD_CREATE')
    expect(shared.ensureOrganization).not.toHaveBeenCalled()
    expect((await executeFirstPlatformOwnerBootstrap(prisma,input)).platformOrganization).toBe('CREATED')
    expect(shared.ensureOrganization).toHaveBeenCalledOnce()
    expect(shared.appendOrganization).toHaveBeenCalledTimes(3)
  })

  it('de service zelf weigert productie ook wanneer zij buiten het script wordt aangeroepen', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { prisma } = mockPrisma()
    await expect(executeFirstPlatformOwnerBootstrap(prisma, input)).rejects.toBeInstanceOf(FirstPlatformOwnerBootstrapPolicyError)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('maakt de platformowner transactioneel aan en raakt geen voorwaarden of wachtwoorden aan', async () => {
    const { prisma, transaction } = mockPrisma()
    const report = await executeFirstPlatformOwnerBootstrap(prisma, input)
    expect(report.mode).toBe('execute')
    expect(transaction.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { email: { endsWith: '@example.invalid', mode: 'insensitive' } },
          { email: { endsWith: '.example.invalid', mode: 'insensitive' } },
        ],
      }),
    }))
    expect(transaction.organizationMembership.create).toHaveBeenCalledWith({
      data: { userId, organizationId: 'platform-org', role: 'OWNER', status: 'ACTIVE' },
      select: { id: true },
    })
    expect(transaction.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { platformRole: 'ADMIN' },
    }))
    const updateCall = transaction.user.updateMany.mock.calls[0]?.[0]
    expect(updateCall).not.toHaveProperty('terms')
    expect(updateCall?.data).toEqual({ platformRole: 'ADMIN' })
    expect(JSON.stringify(updateCall?.data)).not.toMatch(/password|email|acceptedTerms|privacy/i)
    expect(transaction.session.deleteMany).toHaveBeenCalledWith({ where: { userId } })
    expect(shared.appendMembership).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      newRole: 'OWNER',
      metadata: { policyVersion: 'FIRST_PLATFORM_OWNER_BOOTSTRAP_V1', operatorReference: input.operatorReference },
    }))
    expect(shared.appendAccount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'ROLE_GRANTED',
      metadata: { policyVersion: 'FIRST_PLATFORM_OWNER_BOOTSTRAP_V1', operatorReference: input.operatorReference, platformRole: 'ADMIN' },
    }))
    expect(JSON.stringify(report)).not.toMatch(/password|email|token|credential/i)
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2)
  })

  it('weigert een tweede uitvoering via de append-only first-owner marker', async () => {
    shared.marker = true
    const { prisma } = mockPrisma()
    await expect(executeFirstPlatformOwnerBootstrap(prisma, input)).rejects.toMatchObject({ code: 'BOOTSTRAP_ALREADY_USED' })
  })

  it('gebruikt een database-transactie en een advisory lock bij gelijktijdige verzoeken', async () => {
    let tail = Promise.resolve()
    const { prisma, transaction, state } = mockPrisma()
    const mutablePrisma = prisma as unknown as { $transaction: (callback: (tx: typeof transaction) => Promise<unknown>, options?: unknown) => Promise<unknown> }
    mutablePrisma.$transaction = async (callback) => {
      const previous = tail
      let release!: () => void
      tail = new Promise<void>((resolve) => { release = resolve })
      await previous
      try { return await callback(transaction) } finally { release() }
    }
    const outcomes = await Promise.allSettled([
      executeFirstPlatformOwnerBootstrap(prisma, input),
      executeFirstPlatformOwnerBootstrap(prisma, input),
    ])
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(4)
    // PostgreSQL returns void for the lock; Prisma must receive a supported scalar.
    expect(transaction.$queryRaw).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: expect.stringMatching(/pg_advisory_xact_lock\(\$1, \$2\)::text/),
      values: [1_431_524_691, 1],
    }))
    expect(state.ownerCount).toBe(1)
    expect(shared.marker).toBe(true)
  })
})
