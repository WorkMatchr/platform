import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findUser: vi.fn(),
}))

vi.mock('@/lib/authorization', () => ({ requireUser: mocks.requireUser }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ user: { findUnique: mocks.findUser } }) }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') }, redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))

import { requireLearningUser } from './learning-authorization'

describe('Learning-accountautorisatie', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'true')
    mocks.requireUser.mockResolvedValue({ id: 'user-a' })
  })

  it('gebruikt de centrale sessie en vereist de actuele actieve accountstatus', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-a', status: 'ACTIVE' })

    await expect(requireLearningUser('/e-learnings/mijn')).resolves.toEqual({ id: 'user-a', status: 'ACTIVE' })
    expect(mocks.requireUser).toHaveBeenCalledWith('/e-learnings/mijn')
    expect(mocks.findUser).toHaveBeenCalledWith({ where: { id: 'user-a' }, select: { id: true, status: true } })
  })

  it.each(['BLOCKED', 'ARCHIVED', 'DELETION_PENDING', 'ANONYMIZED', null])('weigert accountstatus %s', async (status) => {
    mocks.findUser.mockResolvedValue(status ? { id: 'user-a', status } : null)

    await expect(requireLearningUser('/e-learnings')).rejects.toThrow('REDIRECT:/account?toegang=beperkt')
  })

  it('raadpleegt geen Learning-data wanneer er geen centrale sessie is', async () => {
    mocks.requireUser.mockRejectedValue(new Error('Geen sessie'))

    await expect(requireLearningUser('/e-learnings')).rejects.toThrow('Geen sessie')
    expect(mocks.findUser).not.toHaveBeenCalled()
  })
})

afterEach(() => vi.unstubAllEnvs())
it.each(['', 'false', 'TRUE', '1'])('weigert uitgeschakelde of ongeldige gate %s vóór sessie/database', async value => { vi.stubEnv('LEARNING_RUNTIME_ENABLED', value); mocks.requireUser.mockClear(); mocks.findUser.mockClear(); await expect(requireLearningUser('/e-learnings')).rejects.toThrow('NOT_FOUND'); expect(mocks.requireUser).not.toHaveBeenCalled(); expect(mocks.findUser).not.toHaveBeenCalled() })
