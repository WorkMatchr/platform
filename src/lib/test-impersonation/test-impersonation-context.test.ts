import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  sessionFindFirst: vi.fn(),
  sessionDeleteMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    session: {
      findFirst: mocks.sessionFindFirst,
      deleteMany: mocks.sessionDeleteMany,
    },
  }),
}))

import { getCurrentAuthenticationContext } from './test-impersonation-context'

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'platformbeheer@example.invalid',
  displayName: 'Platformbeheerder',
  emailVerified: true,
  platformRole: 'ADMIN',
  status: 'ACTIVE',
}
const target = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'eigenaar@test-wm.example.invalid',
  displayName: 'Testeigenaar',
  emailVerified: true,
  platformRole: 'USER',
  status: 'ACTIVE',
}

describe('authenticatiecontext tijdens testmodus', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('ENABLE_TEST_ACCOUNT_SWITCHER', 'true')
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({
      session: { id: '33333333-3333-4333-8333-333333333333' },
      user: { id: actor.id },
    })
    mocks.sessionFindFirst.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      user: actor,
      impersonatedUserId: target.id,
      impersonationStartedAt: new Date('2026-07-31T09:00:00Z'),
      impersonatedUser: target,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('behoudt de beheerder als actor en gebruikt het testaccount als effectieve gebruiker', async () => {
    await expect(getCurrentAuthenticationContext()).resolves.toMatchObject({
      actorUser: { id: actor.id, platformRole: 'ADMIN' },
      effectiveUser: { id: target.id, platformRole: 'USER' },
      impersonation: {
        effectiveUserId: target.id,
        valid: true,
      },
    })
  })

  it('past een opgeslagen testdoel nooit toe wanneer de feature flag uitstaat', async () => {
    vi.stubEnv('ENABLE_TEST_ACCOUNT_SWITCHER', 'false')

    await expect(getCurrentAuthenticationContext()).resolves.toMatchObject({
      actorUser: { id: actor.id },
      effectiveUser: { id: actor.id },
      impersonation: null,
    })
  })

  it('markeert een later geblokkeerd testaccount als ongeldig zonder beheerrechten toe te passen', async () => {
    mocks.sessionFindFirst.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      user: actor,
      impersonatedUserId: target.id,
      impersonationStartedAt: new Date('2026-07-31T09:00:00Z'),
      impersonatedUser: { ...target, status: 'BLOCKED' },
    })

    await expect(getCurrentAuthenticationContext()).resolves.toMatchObject({
      effectiveUser: { id: actor.id },
      impersonation: {
        effectiveUserId: target.id,
        valid: false,
      },
    })
  })
})
