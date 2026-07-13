import { describe, expect, it } from 'vitest'
import { createOrganizationSchema, organizationProfileSchema } from './organization-validation'

const validInput = {
  name: 'Voorbeeld Organisatie', tradeName: '', organizationType: 'CLIENT', chamberOfCommerceNumber: '',
  generalEmail: ' CONTACT@EXAMPLE.INVALID ', phone: '', website: 'voorbeeld.nl', employeeCount: '12',
  sectorIds: ['00000000-0000-4000-8000-000000000001'], primarySectorId: '00000000-0000-4000-8000-000000000001',
  addressLine: 'Voorbeeldstraat 1', postalCode: '1234ab', city: 'Utrecht', province: '', countryCode: 'nl',
  acceptedBusinessAccuracy: 'on',
}

describe('organisatievalidatie', () => {
  it('normaliseert e-mail, website, postcode, landcode en medewerkerstelling', () => {
    const result = createOrganizationSchema.parse(validInput)
    expect(result).toMatchObject({ generalEmail: 'contact@example.invalid', website: 'https://voorbeeld.nl', postalCode: '1234 AB', countryCode: 'NL', employeeCount: 12 })
  })

  it('vereist minimaal één sector', () => {
    expect(createOrganizationSchema.safeParse({ ...validInput, sectorIds: [] }).success).toBe(false)
  })

  it('vereist dat de primaire sector geselecteerd is', () => {
    const result = createOrganizationSchema.safeParse({ ...validInput, primarySectorId: '00000000-0000-4000-8000-000000000002' })
    expect(result.success).toBe(false)
  })

  it('weigert negatieve en niet-gehele medewerkerstellingen', () => {
    expect(organizationProfileSchema.safeParse({ ...validInput, employeeCount: '-1' }).success).toBe(false)
    expect(organizationProfileSchema.safeParse({ ...validInput, employeeCount: '1.5' }).success).toBe(false)
  })

  it('weigert scripts, onveilige websites en ongeldige landcodes', () => {
    expect(createOrganizationSchema.safeParse({ ...validInput, name: '<script>alert(1)</script>' }).success).toBe(false)
    expect(createOrganizationSchema.safeParse({ ...validInput, website: 'javascript:alert(1)' }).success).toBe(false)
    expect(createOrganizationSchema.safeParse({ ...validInput, countryCode: 'NLD' }).success).toBe(false)
  })
})
