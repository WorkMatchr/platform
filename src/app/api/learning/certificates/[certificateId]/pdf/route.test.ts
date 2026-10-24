import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireLearningUser: vi.fn(),
  getOwnedLearningCertificate: vi.fn(),
  buildLearningCertificatePdf: vi.fn(),
  learningCertificateFilename: vi.fn(),
}))

vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: mocks.requireLearningUser }))
vi.mock('@/lib/learning/learning-certificate-service', () => ({ getOwnedLearningCertificate: mocks.getOwnedLearningCertificate }))
vi.mock('@/lib/learning/learning-certificate-pdf', () => ({
  buildLearningCertificatePdf: mocks.buildLearningCertificatePdf,
  learningCertificateFilename: mocks.learningCertificateFilename,
}))

import { GET } from './route'

const certificateId = '00000000-0000-4000-8000-000000000001'
const certificate = {
  id: certificateId,
  firstName: 'Ada',
  lastName: 'Voorbeeld',
  certificateNumber: 'WM-RIE-2026-0123456789ABCDEF01234567',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireLearningUser.mockResolvedValue({ id: 'owner-user' })
  mocks.getOwnedLearningCertificate.mockResolvedValue(certificate)
  mocks.buildLearningCertificatePdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
  mocks.learningCertificateFilename.mockReturnValue('Certificaat-RIE-in-de-praktijk-Ada-Voorbeeld.pdf')
})

describe('privé-download certificaat-PDF', () => {
  it('genereert alleen voor het geauthenticeerde eigenaarsrecord een no-store PDF', async () => {
    const response = await GET(new Request('https://workmatchr.nl/api/learning/certificates/' + certificateId + '/pdf'), { params: Promise.resolve({ certificateId }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-disposition')).toContain('Certificaat-RIE-in-de-praktijk-Ada-Voorbeeld.pdf')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(mocks.getOwnedLearningCertificate).toHaveBeenCalledWith('owner-user', certificateId)
    expect(mocks.buildLearningCertificatePdf).toHaveBeenCalledWith(certificate)
  })

  it('geeft geen PDF voor een certificaat dat niet van de ingelogde gebruiker is', async () => {
    mocks.getOwnedLearningCertificate.mockResolvedValue(null)

    const response = await GET(new Request('https://workmatchr.nl/api/learning/certificates/' + certificateId + '/pdf'), { params: Promise.resolve({ certificateId }) })

    expect(response.status).toBe(404)
    expect(mocks.buildLearningCertificatePdf).not.toHaveBeenCalled()
  })

  it('wijst een ongeldige interne identifier af voordat sessie of database wordt geraadpleegd', async () => {
    const response = await GET(new Request('https://workmatchr.nl/api/learning/certificates/not-an-id/pdf'), { params: Promise.resolve({ certificateId: 'not-an-id' }) })

    expect(response.status).toBe(404)
    expect(mocks.requireLearningUser).not.toHaveBeenCalled()
    expect(mocks.getOwnedLearningCertificate).not.toHaveBeenCalled()
  })
})
