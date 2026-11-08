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
      workAreas: [{ regionCode: 'NATIONWIDE' }],
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
        workAreas: [{ regionCode: 'NATIONWIDE' }],
      }),
    }))
    expect(rankMatchingCandidates(candidates)).toHaveLength(2)
    expect(rankMatchingCandidates(candidates)).toEqual(rankMatchingCandidates([...candidates].reverse()))
  })

  it.each([
    ['NOORD_HOLLAND', 'ON_SITE', false, 'EXCLUDED'],
    ['UTRECHT', 'ON_SITE', false, 'ELIGIBLE'],
    ['UTRECHT', 'HYBRID', false, 'ELIGIBLE'],
    ['UTRECHT', 'REMOTE', false, 'EXCLUDED'],
    ['NATIONWIDE', 'ON_SITE', false, 'ELIGIBLE'],
    [null, 'ON_SITE', false, 'EXCLUDED'],
    ['NOORD_HOLLAND', 'REMOTE', true, 'ELIGIBLE'],
    ['REMOTE', 'HYBRID', true, 'ELIGIBLE'],
    ['UTRECHT', 'ON_SITE', true, 'EXCLUDED'],
  ] as const)('toetst werkgebied %s en leveringsvorm %s bij remote=%s', (area, mode, remote, status) => {
    const result = evaluateMatchingCandidate({ ...assignment, allowsRemoteWork: remote }, {
      providerProfileId: 'provider',
      capabilities: [{ serviceCode: 'RIE', specialismCode: null, deliveryModes: [mode] }],
      workAreas: area ? [{ regionCode: area }] : [],
      sectors: [{ sectorCode: 'BOUW' }],
    })
    expect(result.status).toBe(status)
    if (status === 'EXCLUDED') {
      expect(result.normalizedScore).toBeNull()
      expect(rankMatchingCandidates([{ result, providerProfileId: 'provider' }])).toEqual([])
    }
  })

  it('vereist bij gecombineerde uitvoering ook fysieke dekking voor de gekozen dienst', () => {
    const facts = { ...assignment, allowsRemoteWork: true, requiresPhysicalPresence: true }
    const hybrid = { providerProfileId: 'hybrid', capabilities: [{ serviceCode: 'RIE', specialismCode: null, deliveryModes: ['HYBRID'] }], sectors: [], workAreas: [{ regionCode: 'UTRECHT' }] }
    expect(evaluateMatchingCandidate(facts, hybrid).status).toBe('ELIGIBLE')
    expect(evaluateMatchingCandidate(facts, { ...hybrid, workAreas: [{ regionCode: 'NOORD_HOLLAND' }] }).status).toBe('EXCLUDED')
    expect(evaluateMatchingCandidate({ ...facts, regionCode: null }, hybrid).status).toBe('EXCLUDED')
  })

  it('matcht een concrete vakdiscipline uitsluitend op het geverifieerde specialisme', () => {
    const ergonomicsRequest = {
      ...assignment,
      capabilityCode: 'ergonoom',
    }
    const ergonomist = evaluateMatchingCandidate(ergonomicsRequest, {
      providerProfileId: '66666666-6666-4666-8666-666666666666',
      capabilities: [{
        serviceCode: 'SAFETY_ADVICE',
        specialismCode: 'ergonoom',
        deliveryModes: ['ON_SITE'],
      }],
      sectors: [{ sectorCode: 'BOUW' }],
      workAreas: [{ regionCode: 'UTRECHT' }],
    })
    const genericSafetyProvider = evaluateMatchingCandidate(
      ergonomicsRequest,
      {
        providerProfileId: '77777777-7777-4777-8777-777777777777',
        capabilities: [{
          serviceCode: 'SAFETY_ADVICE',
          specialismCode: 'veiligheidskundige',
          deliveryModes: ['ON_SITE'],
        }],
        sectors: [{ sectorCode: 'BOUW' }],
        workAreas: [{ regionCode: 'UTRECHT' }],
      },
    )

    expect(ergonomist.status).toBe('ELIGIBLE')
    expect(genericSafetyProvider.status).toBe('EXCLUDED')
    expect(genericSafetyProvider.exclusionReasons).toContain(
      'DIENST_NIET_AANGEBODEN',
    )
  })
})
