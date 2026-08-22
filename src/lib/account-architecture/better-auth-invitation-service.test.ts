import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  runWithEndpointContext: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    $context: Promise.resolve({
      password: { hash: mocks.hash },
    }),
  },
}))

vi.mock('@better-auth/core/context', () => ({
  runWithEndpointContext: mocks.runWithEndpointContext,
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}))

describe('Better Auth-uitnodigingscredential', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hash.mockResolvedValue('better-auth-hash')
    mocks.runWithEndpointContext.mockImplementation(
      async (_context: unknown, callback: () => Promise<string>) => callback(),
    )
  })

  it('hasht de tijdelijke uitnodigingscredential binnen de officiële Better Auth-endpointcontext', async () => {
    const { hashInvitationCredential } = await import('./better-auth-invitation-service')

    await expect(hashInvitationCredential()).resolves.toBe('better-auth-hash')

    expect(mocks.runWithEndpointContext).toHaveBeenCalledWith(
      expect.objectContaining({ context: expect.objectContaining({ password: expect.any(Object) }) }),
      expect.any(Function),
    )
    expect(mocks.hash).toHaveBeenCalledWith(expect.any(String))
  })
})
