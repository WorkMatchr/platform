import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireManager: vi.fn(),
  requirePermission: vi.fn(),
  submissionFindFirst: vi.fn(),
  submissionUpdateMany: vi.fn(),
  historyCreate: vi.fn(),
  reviewCaseFindFirst: vi.fn(),
  reviewCaseUpdate: vi.fn(),
  findingFindFirst: vi.fn(),
  resolutionAggregate: vi.fn(),
  resolutionCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./provider-authorization', () => ({
  requireProviderManager: mocks.requireManager,
  requireProviderPlatformPermission: mocks.requirePermission,
}))

import {
  buildProviderDossierSnapshot,
  finalizeProviderDossierReview,
  resolveProviderDossierFinding,
  withdrawProviderDossierSubmission,
} from './provider-dossier-service'

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`
const transaction = {
  providerDossierSubmission: { findFirst: mocks.submissionFindFirst, updateMany: mocks.submissionUpdateMany },
  providerDossierSubmissionHistory: { create: mocks.historyCreate },
  providerDossierReviewCase: { findFirst: mocks.reviewCaseFindFirst, update: mocks.reviewCaseUpdate },
  providerDossierFinding: { findFirst: mocks.findingFindFirst },
  providerDossierFindingResolution: { aggregate: mocks.resolutionAggregate, create: mocks.resolutionCreate },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transaction))
  mocks.requireManager.mockResolvedValue({ id: id('1'), version: 1 })
  mocks.requirePermission.mockResolvedValue({ id: id('9') })
  mocks.submissionFindFirst.mockResolvedValue({
    status: 'SUBMITTED',
    version: 1,
    currentCandidateId: id('3'),
    reviewCases: [],
  })
  mocks.submissionUpdateMany.mockResolvedValue({ count: 1 })
  mocks.historyCreate.mockResolvedValue({ id: id('4') })
})

describe('provider dossier workflow', () => {
  it('maakt voor dezelfde canonieke inhoud exact dezelfde SHA-256 snapshot', () => {
    const first = buildProviderDossierSnapshot({ z: [2, 1], a: { label: 'Arbo', active: true } })
    const second = buildProviderDossierSnapshot({ a: { active: true, label: 'Arbo' }, z: [2, 1] })
    expect(first).toEqual(second)
    expect(first).toMatchObject({ schemaVersion: 'PROVIDER-DOSSIER-2', canonicalizationVersion: 'WORKMATCHR-CJ-1' })
    expect(first.sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('trekt uitsluitend een actieve submission met verplichte reden in', async () => {
    const result = await withdrawProviderDossierSubmission(id('1'), id('2'), {
      submissionId: id('5'), expectedVersion: 1, reason: 'De organisatie wil het dossier later opnieuw indienen.',
    })
    expect(result).toMatchObject({ status: 'WITHDRAWN', version: 2 })
    expect(mocks.submissionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'SUBMITTED', version: 1 }),
      data: expect.objectContaining({ status: 'WITHDRAWN', version: { increment: 1 } }),
    }))
    expect(mocks.historyCreate).toHaveBeenCalledOnce()
  })

  it('weigert een providerlid zonder OWNER- of ADMIN-recht server-side', async () => {
    mocks.requireManager.mockRejectedValue({ code: 'ACCESS_DENIED' })
    await expect(withdrawProviderDossierSubmission(id('1'), id('2'), {
      submissionId: id('5'), expectedVersion: 1, reason: 'Deze intrekking heeft een geldige toelichting.',
    })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.submissionUpdateMany).not.toHaveBeenCalled()
  })

  it('behandelt een identieke herhaalde intrekking idempotent', async () => {
    mocks.submissionFindFirst.mockResolvedValue({ status: 'WITHDRAWN', version: 2, reviewCases: [] })
    const result = await withdrawProviderDossierSubmission(id('1'), id('2'), {
      submissionId: id('5'), expectedVersion: 1, reason: 'Deze intrekking heeft een geldige toelichting.',
    })
    expect(result).toEqual({ submissionId: id('5'), status: 'WITHDRAWN', version: 2 })
    expect(mocks.submissionUpdateMany).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('meldt een concurrencyconflict zonder gedeeltelijke historie', async () => {
    mocks.submissionUpdateMany.mockResolvedValue({ count: 0 })
    await expect(withdrawProviderDossierSubmission(id('1'), id('2'), {
      submissionId: id('5'), expectedVersion: 1, reason: 'Deze intrekking heeft een geldige toelichting.',
    })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('schrijft een findingresolution als nieuwe append-only versie', async () => {
    mocks.findingFindFirst.mockResolvedValue({ id: id('6') })
    mocks.resolutionAggregate.mockResolvedValue({ _max: { version: 2 } })
    mocks.resolutionCreate.mockResolvedValue({ id: id('7'), version: 3 })
    const result = await resolveProviderDossierFinding(id('1'), id('2'), {
      findingId: id('6'), expectedResolutionVersion: 2,
      response: 'De gevraagde toelichting en actuele gegevens zijn toegevoegd.',
    })
    expect(result).toEqual({ id: id('7'), version: 3 })
    expect(mocks.resolutionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 3 }) }))
  })

  it('weigert een findingresolution op basis van een verouderde revisieversie', async () => {
    mocks.findingFindFirst.mockResolvedValue({ id: id('6') })
    mocks.resolutionAggregate.mockResolvedValue({ _max: { version: 2 } })
    await expect(resolveProviderDossierFinding(id('1'), id('2'), {
      findingId: id('6'), expectedResolutionVersion: 1,
      response: 'De gevraagde toelichting is opnieuw aangevuld.',
    })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.resolutionCreate).not.toHaveBeenCalled()
  })

  it('dwingt vier ogen af vóór een definitief beoordelingsbesluit', async () => {
    await expect(finalizeProviderDossierReview(id('8'), id('2'), 'APPROVED', {
      submissionId: id('5'), reviewCaseId: id('6'), expectedVersion: 2,
      reviewedByUserId: id('8'), reasonCode: 'DOSSIER_APPROVED',
    })).rejects.toMatchObject({ code: 'FOUR_EYES_REQUIRED' })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
