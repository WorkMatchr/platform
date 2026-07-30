import { describe, expect, it } from 'vitest'
import {
  categorySpecialisms,
  TEST_PROVIDER_PREFIX,
  exclusionReason,
  expectedProvidersForScenario,
  provinceFixtures,
  serviceCodes,
  testClientSpecs,
  testFilterScenarios,
  testProviderSpecs,
} from './test-provider-dataset'

describe('fictieve providerdataset', () => {
  it('bevat exact 50 deterministische, unieke dienstverleners', () => {
    expect(testProviderSpecs).toHaveLength(50)
    expect(new Set(testProviderSpecs.map((provider) => provider.code)).size).toBe(50)
    expect(new Set(testProviderSpecs.map((provider) => provider.organizationName)).size).toBe(50)
    expect(testProviderSpecs.every((provider) => provider.organizationName.startsWith(TEST_PROVIDER_PREFIX))).toBe(true)
    expect(testProviderSpecs.some((provider) => provider.organizationName.includes('Delta Veiligheidsadvies'))).toBe(true)
    expect(testProviderSpecs.some((provider) => provider.organizationName.includes('BrandVeilig Adviesgroep'))).toBe(true)
  })

  it('dekt alle provincies, diensten en statuscategorieën', () => {
    expect(new Set(testProviderSpecs.map((provider) => provider.provinceCode))).toEqual(new Set(provinceFixtures.map(([code]) => code)))
    expect(new Set(testProviderSpecs.flatMap((provider) => provider.serviceCodes))).toEqual(new Set(serviceCodes))
    expect(new Set(testProviderSpecs.map((provider) => provider.category)).size).toBe(9)
    expect(testProviderSpecs.some((provider) => provider.serviceCodes.length > 1)).toBe(true)
  })

  it('gebruikt uitsluitend herkenbare fictieve contactgegevens', () => {
    for (const provider of testProviderSpecs) {
      expect(provider.organizationName).toMatch(/^TEST-WM-[\p{L}]/u)
      expect(provider.chamberOfCommerceNumber).toMatch(/^TEST-WM-KVK-\d{4}$/)
      expect(provider.email).toMatch(/@dienstverlener-\d{2}\.example\.invalid$/)
      expect(provider.website).toMatch(/^https:\/\/dienstverlener-\d{2}\.example\.invalid$/)
      expect(provider.phone).toMatch(/^\+31 20 000 \d{4}$/)
      expect(provider.logoPlaceholder).toMatch(/^[A-Z]{1,3}$/)
    }
  })

  it('volgt de afgesproken beroepsverdeling', () => {
    const counts = Object.groupBy(testProviderSpecs, (provider) => provider.professionalCategory)
    expect(Object.fromEntries(Object.entries(counts).map(([category, providers]) => [category, providers?.length ?? 0]))).toEqual({
      MVK: 10,
      HVK: 8,
      BEDRIJFSARTS: 6,
      ARBEIDSHYGIENIST: 5,
      ARBEIDSDESKUNDIGE: 4,
      ERGONOOM: 3,
      BHV_SPECIALIST: 6,
      MACHINEVEILIGHEID: 3,
      ASBEST: 2,
      VEILIGHEIDSADVIES: 3,
    })
  })

  it('koppelt iedere beroepscategorie aan een concrete centrale specialismecode', () => {
    expect(categorySpecialisms.ERGONOOM).toBe('ergonoom')
    expect(categorySpecialisms.HVK).toBe(
      'hogere-veiligheidskundige',
    )
    expect(categorySpecialisms.MVK).toBe(
      'middelbare-veiligheidskundige',
    )
    expect(categorySpecialisms.ARBEIDSHYGIENIST).toBe(
      'arbeidshygienist',
    )
    expect(categorySpecialisms.ARBEIDSDESKUNDIGE).toBe(
      'arbeidsdeskundige',
    )
  })

  it('varieert ervaring, beoordeling, beschikbaarheid, tarieven en diensten', () => {
    expect(new Set(testProviderSpecs.map((provider) => provider.experienceYears))).toEqual(new Set([3, 8, 15, 25]))
    expect(new Set(testProviderSpecs.map((provider) => provider.rating))).toEqual(new Set([4.2, 4.6, 4.8, 5]))
    expect(new Set(testProviderSpecs.map((provider) => provider.availability))).toEqual(new Set(['DIRECT', 'TWO_WEEKS', 'ONE_MONTH']))
    expect(new Set(testProviderSpecs.map((provider) => provider.hourlyRate))).toEqual(new Set([75, 95, 110, 125, 145, 175]))
    expect(testProviderSpecs.filter((provider) => provider.serviceCodes.length > 1).length).toBeGreaterThan(20)
    expect(testProviderSpecs.every((provider) => provider.focusAreas.length >= 3)).toBe(true)
  })

  it('bevat exact twintig unieke fictieve opdrachtgevers met landelijke sectorspreiding', () => {
    expect(testClientSpecs).toHaveLength(20)
    expect(new Set(testClientSpecs.map((client) => client.code)).size).toBe(20)
    expect(new Set(testClientSpecs.map((client) => client.organizationName)).size).toBe(20)
    expect(new Set(testClientSpecs.map((client) => client.provinceCode)).size).toBe(12)
    expect(new Set(testClientSpecs.map((client) => client.sectorCode))).toEqual(new Set([
      'bouw',
      'industrie',
      'logistiek',
      'zorg',
      'overheid',
      'onderwijs',
      'zakelijke-dienstverlening',
      'detailhandel',
      'landbouw',
      'horeca',
    ]))
    expect(testClientSpecs.every((client) => client.email.endsWith('.example.invalid'))).toBe(true)
  })

  it('legt tien vaste, verklaarbare filterorakels vast', () => {
    expect(testFilterScenarios).toHaveLength(10)
    for (const scenario of testFilterScenarios) {
      const expected = expectedProvidersForScenario(scenario)
      expect(new Set(expected).size).toBe(expected.length)
      for (const provider of testProviderSpecs) {
        expect(exclusionReason(provider, scenario) === null).toBe(expected.includes(provider.code))
      }
    }
  })
})
