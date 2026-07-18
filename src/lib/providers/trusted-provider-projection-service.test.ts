import { describe, expect, it } from 'vitest'
import { buildTrustedProviderPayload } from './trusted-provider-projection-service'

describe('Trusted Provider Projection contract', () => {
  it('neemt uitsluitend toegestane selectievelden over', () => {
    const payload = buildTrustedProviderPayload({
      providerProfileId: 'provider-1',
      sourceVersion: 3,
      taxonomyVersions: [{ kind: 'SERVICE', version: 1, checksum: 'a'.repeat(64) }],
      capabilities: [{ serviceCode: 'SAFETY_ADVICE', specialismCode: null, competencyCode: 'SAFETY_ADVISORY', deliveryModes: ['REMOTE'], verificationLevel: 'VERIFIED' }],
      sectors: [{ sectorCode: 'bouw', verificationLevel: 'DOCUMENT_CHECKED' }],
      workAreas: [{ regionCode: 'NATIONWIDE', maxTravelDistanceKm: null, verificationLevel: 'DOCUMENT_CHECKED' }],
      platformQualificationDecisionId: 'decision-1',
      marketingText: 'mag niet mee',
      professionalName: 'mag niet mee',
      credits: 100,
    } as never)
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('marketingText')
    expect(serialized).not.toContain('professionalName')
    expect(serialized).not.toContain('credits')
    expect(serialized).not.toContain('evidence')
    expect(serialized).not.toContain('capacity')
    expect(serialized).not.toContain('acceptsNewAssignments')
    expect(serialized).toContain('"schemaVersion":2')
    expect(serialized).toContain('SAFETY_ADVICE')
  })
})
