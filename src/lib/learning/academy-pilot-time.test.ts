import { expect, it } from 'vitest'
import { measuredInterval, pilotDistribution } from './academy-pilot-time'
const at = (ms: number) => new Date(ms)
it('telt uitsluitend opeenvolgende interacties in hetzelfde venster en onderdeel', () => {
  expect(measuredInterval(at(0), at(3500), true, true)).toEqual({ activeMs: 3500, incomplete: false })
  expect(measuredInterval(null, at(3500), true, true).activeMs).toBe(0)
  expect(measuredInterval(at(0), at(3500), false, true)).toEqual({ activeMs: 0, incomplete: true })
  expect(measuredInterval(at(0), at(3500), true, false).activeMs).toBe(0)
})
it('sluit stilstand, een nacht pauze en een dubbele waarneming uit', () => {
  expect(measuredInterval(at(0), at(60001), true, true)).toEqual({ activeMs: 0, incomplete: true })
  expect(measuredInterval(at(0), at(86400000), true, true).activeMs).toBe(0)
  expect(measuredInterval(at(3500), at(3500), true, true).activeMs).toBe(0)
})
it('berekent spreiding voor even en oneven groepen en geeft ontbrekende metingen apart aan', () => {
  expect(pilotDistribution([])).toBeNull()
  expect(pilotDistribution([9, 3, 1, 3])).toEqual({ min: 1, max: 9, mean: 4, median: 3 })
  expect(pilotDistribution([9, 1, 5])?.median).toBe(5)
})
