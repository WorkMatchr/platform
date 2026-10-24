import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicLearningCertificate } from './learning-certificate-service'

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ learningCertificate: { findUnique: mocks.findUnique } }),
}))

beforeEach(() => mocks.findUnique.mockReset())

describe('publieke certificaatreadmodel', () => {
  it('geeft voor een revoked code uitsluitend de velden terug die de publieke pagina nodig heeft', async () => {
    const revoked = {
      certificateNumber: 'WM-RIE-2026-0123456789ABCDEF01234567',
      firstName: 'Voorbeeld',
      lastName: 'Deelnemer',
      courseTitle: 'RI&E in de praktijk',
      issuedAt: new Date('2026-09-30T12:00:00.000Z'),
      status: 'REVOKED',
    }
    mocks.findUnique.mockResolvedValue(revoked)

    await expect(getPublicLearningCertificate('wm-rie-2026-0123456789abcdef01234567')).resolves.toEqual(revoked)
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { certificateNumber: revoked.certificateNumber },
      select: { certificateNumber: true, firstName: true, lastName: true, courseTitle: true, issuedAt: true, status: true },
    })
  })

  it('wijst ongeldige codes af voordat een databasequery wordt gedaan', async () => {
    await expect(getPublicLearningCertificate('42')).resolves.toBeNull()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })
})
