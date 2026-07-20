import { describe, expect, it } from 'vitest'
import { evaluateMatchingCandidate, rankMatchingCandidates } from './matching-rules'

const assignment = {
  assignmentId: '11111111-1111-4111-8111-111111111111',
  capabilityCode: 'RIE',
  sectorCode: 'BOUW',
  regionCode: 'UTRECHT',
  allowsRemoteWork: false,
}

describe('matchingregels', () => {
  it('sluit een aanbieder vóór scoring uit als de dienst ontbreekt', () => {
    const result = evaluateMatchingCandidate(assignment, {
      providerProfileId: '22222222-2222-4222-8222-222222222222',
      capabilities: [],
      sectors: [{ sectorCode: 'BOUW' }],
      workAreas: [{ regionCode: 'LANDELIJK' }],
    })
    expect(result.status).toBe('EXCLUDED')
    expect(result.normalizedScore).toBeNull()
    expect(result.exclusionReasons).toContain('DIENST_NIET_AANGEBODEN')
  })

  it('scoort uitsluitend actieve criteria en blijft deterministisch', () => {
    const provider = {
      providerProfileId: '33333333-3333-4333-8333-333333333333',
      capabilities: [{ serviceCode: 'RIE', specialismCode: null, deliveryModes: ['ON_SITE'] }],
      sectors: [{ sectorCode: 'BOUW' }],
      workAreas: [{ regionCode: 'UTRECHT' }],
    }
    const first = evaluateMatchingCandidate(assignment, provider)
    const second = evaluateMatchingCandidate(assignment, provider)
    expect(first).toEqual(second)
    expect(first.status).toBe('ELIGIBLE')
    expect(first.normalizedScore).toBe(10_000)
  })

  it('rangschikt stabiel zonder betaal- of prestatiegegevens', () => {
    const candidates = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'].map((providerProfileId) => ({
      providerProfileId,
      result: evaluateMatchingCandidate(assignment, {
        providerProfileId,
        capabilities: [{ serviceCode: 'RIE', specialismCode: null, deliveryModes: ['ON_SITE'] }],
        sectors: [],
        workAreas: [{ regionCode: 'LANDELIJK' }],
      }),
    }))
    expect(rankMatchingCandidates(candidates)).toEqual(rankMatchingCandidates([...candidates].reverse()))
  })
})
