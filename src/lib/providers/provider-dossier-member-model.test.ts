import { describe, expect, it } from 'vitest'
import { sanitizeProviderEvidenceForMember, sanitizeProviderInsuranceForMember } from './provider-dossier-query-service'

describe('provider MEMBER-read-model', () => {
  it('sluit polisreferentie en dekkingsbedrag uit', () => {
    expect(sanitizeProviderInsuranceForMember({ insurer: 'Voorbeeld', policyReference: 'GEHEIM-123', coverageAmountCents: BigInt(1000) })).toEqual({ insurer: 'Voorbeeld' })
  })

  it('sluit storagekey en volledige bewijsmetadata uit', () => {
    expect(sanitizeProviderEvidenceForMember({ id: 'evidence', available: true, storageKey: 'private/key', revisions: [{ originalFileName: 'bewijs.pdf' }] })).toEqual({ id: 'evidence', available: true })
  })
})
