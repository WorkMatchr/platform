import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  membershipFind: vi.fn(), organizationUpdate: vi.fn(), save: vi.fn(), delete: vi.fn(), process: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ organizationMembership: { findUnique: mocks.membershipFind }, organization: { update: mocks.organizationUpdate } }) }))
vi.mock('./logo-storage', () => ({ getOrganizationLogoStorage: () => ({ save: mocks.save, delete: mocks.delete }) }))
vi.mock('./logo-processing', () => ({ processOrganizationLogo: mocks.process }))

import { removeOrganizationLogo, replaceOrganizationLogo } from './logo-service'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.membershipFind.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE', organization: { id: 'organization-id', status: 'ACTIVE', logoStorageKey: '11111111-1111-4111-8111-111111111111.webp' } })
  mocks.process.mockResolvedValue({ data: Buffer.from('new'), mimeType: 'image/webp', sizeBytes: 3, width: 10, height: 8 })
  mocks.save.mockResolvedValue('22222222-2222-4222-8222-222222222222.webp')
  mocks.organizationUpdate.mockResolvedValue({})
})

describe('logovervanging en verwijdering', () => {
  it('slaat eerst nieuw op, wijzigt metadata en verwijdert daarna het oude bestand', async () => {
    const file = new File([new Uint8Array([1])], 'misleidende-naam.exe', { type: 'image/png' })
    await replaceOrganizationLogo('user-id', 'organization-id', file)
    expect(mocks.save).toHaveBeenCalled()
    expect(mocks.organizationUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'organization-id' }, data: expect.objectContaining({ logoMimeType: 'image/webp' }) }))
    expect(mocks.delete).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111.webp')
    expect(mocks.organizationUpdate.mock.invocationCallOrder[0]).toBeLessThan(mocks.delete.mock.invocationCallOrder[0])
  })

  it('verwijdert eerst database-metadata en daarna het bestand', async () => {
    await removeOrganizationLogo('user-id', 'organization-id')
    expect(mocks.organizationUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ logoStorageKey: null, logoMimeType: null, logoUpdatedAt: null }) }))
    expect(mocks.delete).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111.webp')
  })

  it('laat MEMBER niet wijzigen', async () => {
    mocks.membershipFind.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE', organization: { status: 'ACTIVE' } })
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' })
    await expect(replaceOrganizationLogo('user-id', 'organization-id', file)).rejects.toThrow('geen toegang')
    expect(mocks.save).not.toHaveBeenCalled()
  })
})
