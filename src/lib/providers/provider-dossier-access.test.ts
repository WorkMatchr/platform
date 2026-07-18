import { describe, expect, it, vi } from 'vitest'
import { requireProviderSectionEditable } from './provider-dossier-access'

describe('provider dossier section lock', () => {
  it('blokkeert alle mutaties tijdens beoordeling', async () => {
    const transaction = { providerDossierSubmission: { findFirst: vi.fn().mockResolvedValue({ status: 'UNDER_REVIEW', reviewCases: [] }) } }
    await expect(requireProviderSectionEditable(transaction as never, 'provider', 'CAPABILITIES')).rejects.toMatchObject({ code: 'DOSSIER_LOCKED' })
  })

  it('staat bij aanvullende informatie alleen aangewezen secties toe', async () => {
    const transaction = { providerDossierSubmission: { findFirst: vi.fn().mockResolvedValue({ status: 'ADDITIONAL_INFORMATION_REQUIRED', reviewCases: [{ findings: [{ section: 'CAPACITY' }] }] }) } }
    await expect(requireProviderSectionEditable(transaction as never, 'provider', 'CAPACITY')).resolves.toBeUndefined()
    await expect(requireProviderSectionEditable(transaction as never, 'provider', 'INSURANCE')).rejects.toMatchObject({ code: 'SECTION_NOT_EDITABLE' })
  })
})
