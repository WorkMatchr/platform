import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requirePermission: vi.fn(),
  capabilityFind: vi.fn(),
  reasonFind: vi.fn(),
  reviewCreate: vi.fn(),
  profileUpdateMany: vi.fn(),
  projectionFind: vi.fn(),
  evidenceFind: vi.fn(),
  scanFind: vi.fn(),
  scanCreate: vi.fn(),
  documentUpdate: vi.fn(),
  profileUpdate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./provider-authorization', () => ({ requireProviderPlatformPermission: mocks.requirePermission }))

import { recordProviderEvidenceScanDecision, recordProviderVerificationReview } from './provider-verification-service'

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`
const transactionClient = {
  providerCapabilityRevision: { findFirst: mocks.capabilityFind },
  providerSectorExperienceRevision: { findFirst: vi.fn() },
  providerWorkAreaRevision: { findFirst: vi.fn() },
  providerProfessionalQualificationRevision: { findFirst: vi.fn() },
  providerOrganizationQualificationRevision: { findFirst: vi.fn() },
  providerInsuranceRevision: { findFirst: vi.fn() },
  providerEvidenceRevision: { findFirst: vi.fn(), findUnique: mocks.evidenceFind },
  providerReasonCode: { findUnique: mocks.reasonFind },
  providerVerificationReview: { create: mocks.reviewCreate },
  providerProfile: { updateMany: mocks.profileUpdateMany, update: mocks.profileUpdate },
  trustedProviderProjection: { findFirst: mocks.projectionFind },
  trustedProviderProjectionInvalidation: { create: vi.fn() },
  providerEvidenceScanDecision: { findUnique: mocks.scanFind, create: mocks.scanCreate },
  providerEvidenceDocument: { update: mocks.documentUpdate },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.requirePermission.mockResolvedValue({ id: id('8') })
  mocks.capabilityFind.mockResolvedValue({ id: id('2') })
  mocks.reasonFind.mockResolvedValue({ id: id('3') })
  mocks.reviewCreate.mockResolvedValue({ id: id('4'), outcome: 'DOCUMENT_CHECKED', resultingLevel: 'DOCUMENT_CHECKED', checksum: 'a'.repeat(64) })
  mocks.profileUpdateMany.mockResolvedValue({ count: 1 })
  mocks.projectionFind.mockResolvedValue(null)
  mocks.scanFind.mockResolvedValue(null)
})

describe('providerverificatieservice', () => {
  it('weigert een positief niveau bij een negatieve reviewuitkomst vóór databasewerk', async () => {
    await expect(recordProviderVerificationReview(id('1'), id('5'), {
      expectedProfileVersion: 1,
      subject: { type: 'CAPABILITY', revisionId: id('2') },
      outcome: 'REJECTED',
      resultingLevel: 'VERIFIED',
      reasonCode: 'CONFIGURATION_INCOMPLETE',
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('schrijft een geldige review en verhoogt de profielbronversie', async () => {
    await expect(recordProviderVerificationReview(id('1'), id('5'), {
      expectedProfileVersion: 3,
      subject: { type: 'CAPABILITY', revisionId: id('2') },
      outcome: 'DOCUMENT_CHECKED',
      resultingLevel: 'DOCUMENT_CHECKED',
      reasonCode: 'CONFIGURATION_INCOMPLETE',
    })).resolves.toMatchObject({ id: id('4'), profileVersion: 4 })
    expect(mocks.profileUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: id('5'), version: 3 },
      data: expect.objectContaining({ version: { increment: 1 }, selectabilityStatus: 'NOT_SELECTABLE' }),
    }))
  })

  it('retourneert dezelfde scanbeslissing idempotent zonder nieuwe write', async () => {
    mocks.evidenceFind.mockResolvedValue({ evidenceDocumentId: id('6'), evidenceDocument: { providerProfileId: id('5') } })
    mocks.scanFind.mockResolvedValue({ id: id('7'), scanStatus: 'CLEAN', scannerReference: 'scanner-run-1', checksum: 'b'.repeat(64) })
    await expect(recordProviderEvidenceScanDecision({
      evidenceRevisionId: id('2'),
      scanStatus: 'CLEAN',
      scannerReference: 'scanner-run-1',
      checksum: 'b'.repeat(64),
    })).resolves.toEqual({ id: id('7'), scanStatus: 'CLEAN', idempotent: true })
    expect(mocks.scanCreate).not.toHaveBeenCalled()
    expect(mocks.documentUpdate).not.toHaveBeenCalled()
  })

  it('weigert dezelfde scan-ID met afwijkende uitkomst', async () => {
    mocks.evidenceFind.mockResolvedValue({ evidenceDocumentId: id('6'), evidenceDocument: { providerProfileId: id('5') } })
    mocks.scanFind.mockResolvedValue({ id: id('7'), scanStatus: 'REJECTED', scannerReference: 'scanner-run-1', checksum: 'b'.repeat(64) })
    await expect(recordProviderEvidenceScanDecision({
      evidenceRevisionId: id('2'),
      scanStatus: 'CLEAN',
      scannerReference: 'scanner-run-1',
      checksum: 'b'.repeat(64),
    })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
  })
})
