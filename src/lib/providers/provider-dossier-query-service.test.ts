import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireViewer: vi.fn(),
  providerFindUnique: vi.fn(),
  assessCompleteness: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./provider-authorization', () => ({ requireProviderViewer: mocks.requireViewer }))
vi.mock('./provider-dossier-completeness', () => ({
  assessProviderDossierCompletenessInTransaction: mocks.assessCompleteness,
}))

import { getProviderDossierControlView, getProviderDossierDashboard } from './provider-dossier-query-service'

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`
const transaction = { providerProfile: { findUnique: mocks.providerFindUnique } }

const providerFixture = () => ({
  id: id('1'),
  version: 4,
  updatedAt: new Date('2026-07-15T10:00:00Z'),
  lifecycleStatus: 'ACTIVE',
  readinessStatus: 'INCOMPLETE',
  platformQualificationStatus: 'NOT_ASSESSED',
  selectabilityStatus: 'NOT_SELECTABLE',
  organization: {
    id: id('2'), name: 'Voorbeeldorganisatie', tradeName: null,
    chamberOfCommerceNumber: '12345678', website: null, employeeCount: null,
    updatedAt: new Date('2026-07-15T09:00:00Z'),
  },
  dossierSubmissions: [{
    id: id('3'), status: 'ADDITIONAL_INFORMATION_REQUIRED', version: 3,
    submittedAt: new Date('2026-07-14T10:00:00Z'), currentCandidateId: id('4'),
    reviewCases: [{ findings: [{
      id: id('5'), section: 'ORGANIZATION', providerMessage: 'Licht de bedrijfsomschrijving nader toe.', resolutions: [],
    }] }],
  }],
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transaction))
  mocks.requireViewer.mockResolvedValue({ id: id('1'), membershipRole: 'MEMBER' })
  mocks.assessCompleteness.mockResolvedValue({
    reasons: [], blockingSections: [], warnings: [], isSubmittable: true,
  })
  mocks.providerFindUnique.mockResolvedValue(providerFixture())
})

describe('provider dossier dashboardquery', () => {
  it('levert een tenantveilig dashboard met actieve submission en veilige findings', async () => {
    const result = await getProviderDossierDashboard(id('9'), id('1'))

    expect(mocks.requireViewer).toHaveBeenCalledWith(transaction, id('9'), id('1'))
    expect(result).toMatchObject({
      viewerRole: 'MEMBER',
      activeSubmission: { id: id('3'), status: 'ADDITIONAL_INFORMATION_REQUIRED', version: 3 },
      safeFindings: [{ id: id('5'), section: 'ORGANIZATION', resolved: false }],
    })
    const select = mocks.providerFindUnique.mock.calls[0]?.[0]?.select
    expect(JSON.stringify(select)).not.toContain('internalNote')
    expect(JSON.stringify(result)).not.toContain('internalNote')
  })

  it('toont historische capaciteitsfindings niet meer als provideractie', async () => {
    mocks.providerFindUnique.mockResolvedValueOnce({
      ...providerFixture(),
      dossierSubmissions: [{
        id: id('3'), status: 'ADDITIONAL_INFORMATION_REQUIRED', version: 3,
        submittedAt: new Date('2026-07-14T10:00:00Z'), currentCandidateId: id('4'),
        reviewCases: [{ findings: [{
          id: id('5'), section: 'CAPACITY', providerMessage: 'Bevestig de capaciteit opnieuw.', resolutions: [],
        }] }],
      }],
    })
    const result = await getProviderDossierDashboard(id('9'), id('1'))
    expect(result.safeFindings).toEqual([])
    expect(result.openActions).not.toEqual(expect.arrayContaining([expect.objectContaining({ section: 'CAPACITY' })]))
  })

  it('levert de wijzigingsbevinding en profielversie in één controlquery op', async () => {
    const result = await getProviderDossierControlView(id('9'), id('1'))

    expect(result).toMatchObject({
      profileVersion: 4,
      latestSubmission: { status: 'ADDITIONAL_INFORMATION_REQUIRED', version: 3 },
      safeFindings: [{
        id: id('5'), section: 'ORGANIZATION', message: 'Licht de bedrijfsomschrijving nader toe.',
        resolved: false, latestResolutionVersion: 0,
      }],
    })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.providerFindUnique).toHaveBeenCalledTimes(1)
  })

  it('lekt bij geweigerde tenanttoegang geen dossierdata', async () => {
    mocks.requireViewer.mockRejectedValueOnce({ code: 'ACCESS_DENIED' })
    await expect(getProviderDossierDashboard(id('9'), id('1'))).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.providerFindUnique).not.toHaveBeenCalled()
  })
})
