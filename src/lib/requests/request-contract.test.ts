import { describe, expect, it } from 'vitest'
import {
  canTransitionRequestStatus,
  requestPublicationInputSchema,
  requestStartLabels,
  requestStatusLabels,
} from './request-contract'

describe('Request-publicatiecontract', () => {
  const validInput = {
    adviceDossierId: '00000000-0000-4000-8000-000000000001',
    publicSummary:
      'U wilt ondersteuning bij het beoordelen van de veiligheidssituatie.',
    requestedStart: 'WITHIN_ONE_MONTH',
    notes: '',
  }

  it('accepteert uitsluitend de drie afgesproken planningskeuzes', () => {
    expect(requestPublicationInputSchema.parse(validInput)).toEqual(
      validInput,
    )
    expect(Object.keys(requestStartLabels)).toEqual([
      'AS_SOON_AS_POSSIBLE',
      'WITHIN_ONE_MONTH',
      'IN_CONSULTATION',
    ])
    expect(
      requestPublicationInputSchema.safeParse({
        ...validInput,
        requestedStart: 'NEXT_YEAR',
      }).success,
    ).toBe(false)
  })

  it('valideert de publiceerbare omschrijving en opmerkingen', () => {
    expect(
      requestPublicationInputSchema.safeParse({
        ...validInput,
        publicSummary: 'Te kort',
      }).success,
    ).toBe(false)
    expect(
      requestPublicationInputSchema.safeParse({
        ...validInput,
        notes: 'x'.repeat(2001),
      }).success,
    ).toBe(false)
  })

  it('legt uitsluitend de afgesproken statusovergangen vast', () => {
    expect(canTransitionRequestStatus('DRAFT', 'READY_TO_PUBLISH')).toBe(
      true,
    )
    expect(
      canTransitionRequestStatus('READY_TO_PUBLISH', 'PUBLISHED'),
    ).toBe(true)
    expect(canTransitionRequestStatus('PUBLISHED', 'CANCELLED')).toBe(
      true,
    )
    expect(canTransitionRequestStatus('PUBLISHED', 'DRAFT')).toBe(false)
    expect(canTransitionRequestStatus('CANCELLED', 'PUBLISHED')).toBe(
      false,
    )
    expect(requestStatusLabels.PUBLISHED).toBe('Gepubliceerd')
  })
})
