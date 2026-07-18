import { describe, expect, it } from 'vitest'
import {
  TEST_PROVIDER_PREFIX,
  exclusionReason,
  expectedProvidersForScenario,
  provinceFixtures,
  serviceCodes,
  testFilterScenarios,
  testProviderSpecs,
} from './test-provider-dataset'

describe('fictieve providerdataset', () => {
  it('bevat exact 50 deterministische, unieke dienstverleners', () => {
    expect(testProviderSpecs).toHaveLength(50)
    expect(new Set(testProviderSpecs.map((provider) => provider.code)).size).toBe(50)
    expect(testProviderSpecs.every((provider) => provider.organizationName.startsWith(TEST_PROVIDER_PREFIX))).toBe(true)
  })

  it('dekt alle provincies, diensten en statuscategorieën', () => {
    expect(new Set(testProviderSpecs.map((provider) => provider.provinceCode))).toEqual(new Set(provinceFixtures.map(([code]) => code)))
    expect(new Set(testProviderSpecs.flatMap((provider) => provider.serviceCodes))).toEqual(new Set(serviceCodes))
    expect(new Set(testProviderSpecs.map((provider) => provider.category)).size).toBe(9)
    expect(testProviderSpecs.some((provider) => provider.serviceCodes.length > 1)).toBe(true)
  })

  it('gebruikt uitsluitend herkenbare fictieve contactgegevens', () => {
    for (const provider of testProviderSpecs) {
      expect(provider.organizationName).toMatch(/^TEST-WM-Dienstverlener \d{2}$/)
      expect(provider.city).toMatch(/^Testplaats /)
    }
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
