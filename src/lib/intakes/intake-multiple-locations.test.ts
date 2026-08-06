import { describe, expect, it } from 'vitest'
import { locationItemsFromSerialized, validateMultipleLocations } from './intake-multiple-locations'

describe('meerdere opdrachtlocaties', () => {
  it('normaliseert en bewaart de ingevoerde volgorde', () => {
    const result = validateMultipleLocations([' Utrecht ', 'Regio Rijnmond', 'Zwolle'])
    expect(result).toMatchObject({ values: ['Utrecht', 'Regio Rijnmond', 'Zwolle'], generalError: undefined, errors: {} })
    expect(locationItemsFromSerialized(result.serialized)).toEqual([
      { position: 1, placeOrRegion: 'Utrecht', normalizedValue: 'utrecht' },
      { position: 2, placeOrRegion: 'Regio Rijnmond', normalizedValue: 'regio rijnmond' },
      { position: 3, placeOrRegion: 'Zwolle', normalizedValue: 'zwolle' },
    ])
  })

  it('weigert minder dan twee waarden, lege regels en duplicaten', () => {
    expect(validateMultipleLocations(['Utrecht']).generalError).toContain('minimaal twee')
    expect(validateMultipleLocations(['Utrecht', '']).errors[1]).toContain('Vul')
    expect(validateMultipleLocations(['Utrecht', 'utrecht']).errors[1]).toContain('al in de lijst')
  })

  it('weigert meer dan 25 waarden en waarden langer dan 120 tekens', () => {
    expect(validateMultipleLocations(Array.from({ length: 26 }, (_, index) => `Regio ${index}`)).generalError).toContain('maximaal 25')
    expect(validateMultipleLocations(['a'.repeat(121), 'Utrecht']).errors[0]).toContain('120')
  })
})
