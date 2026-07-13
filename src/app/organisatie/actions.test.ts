import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  createOrganization: vi.fn(),
  redirect: vi.fn(),
  requireUser: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ set: mocks.cookieSet })) }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/authorization', () => ({ requireUser: mocks.requireUser }))
vi.mock('@/lib/prisma', () => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/organizations/organization-authorization', () => ({
  ACTIVE_ORGANIZATION_COOKIE: 'workmatchr-active-organization',
  requireManageableOrganization: vi.fn(),
}))
vi.mock('@/lib/organizations/organization-service', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/organizations/organization-service')>()
  return { ...original, createOrganization: mocks.createOrganization, updateOrganization: vi.fn() }
})
vi.mock('@/lib/organizations/logo-service', () => ({ removeOrganizationLogo: vi.fn(), replaceOrganizationLogo: vi.fn() }))

import { createOrganizationAction } from './actions'

const sectorId = '00000000-0000-4000-8000-000000000001'

function validFormData(): FormData {
  const formData = new FormData()
  formData.set('name', 'Voorbeeld Organisatie')
  formData.set('tradeName', 'Reeds ingevulde handelsnaam')
  formData.set('organizationType', 'CLIENT')
  formData.set('chamberOfCommerceNumber', '12345678')
  formData.set('generalEmail', 'contact@example.invalid')
  formData.set('phone', '030-1234567')
  formData.set('website', 'voorbeeld.nl')
  formData.set('employeeCount', '25')
  formData.append('sectorIds', sectorId)
  formData.set('primarySectorId', sectorId)
  formData.set('addressLine', 'Voorbeeldstraat 1')
  formData.set('postalCode', '1234 AB')
  formData.set('city', 'Utrecht')
  formData.set('province', 'Utrecht')
  formData.set('countryCode', 'NL')
  formData.set('acceptedBusinessAccuracy', 'on')
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireUser.mockResolvedValue({ id: 'user-id' })
  mocks.createOrganization.mockResolvedValue({ id: 'organization-id' })
})

describe('organisatie Server Action', () => {
  it('behoudt alle bestaande invoer na een validatiefout', async () => {
    const formData = validFormData()
    formData.set('generalEmail', 'ongeldig e-mailadres')

    const result = await createOrganizationAction({}, formData)

    expect(result.values).toEqual({
      name: 'Voorbeeld Organisatie',
      tradeName: 'Reeds ingevulde handelsnaam',
      organizationType: 'CLIENT',
      chamberOfCommerceNumber: '12345678',
      generalEmail: 'ongeldig e-mailadres',
      phone: '030-1234567',
      website: 'voorbeeld.nl',
      employeeCount: '25',
      sectorIds: [sectorId],
      primarySectorId: sectorId,
      addressLine: 'Voorbeeldstraat 1',
      postalCode: '1234 AB',
      city: 'Utrecht',
      province: 'Utrecht',
      countryCode: 'NL',
      acceptedBusinessAccuracy: 'on',
    })
    expect(result.errors?.generalEmail).toEqual(['Vul een geldig algemeen e-mailadres in.'])
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it('toont de juiste veldfout wanneer de organisatienaam ontbreekt', async () => {
    const formData = validFormData()
    formData.set('name', '')

    const result = await createOrganizationAction({}, formData)

    expect(result.errors?.name).toEqual(['Officiële organisatienaam is verplicht.'])
    expect(result.values?.tradeName).toBe('Reeds ingevulde handelsnaam')
  })

  it('behoudt de succesvolle submit-, cookie- en redirectflow', async () => {
    await createOrganizationAction({}, validFormData())

    expect(mocks.createOrganization).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({
        name: 'Voorbeeld Organisatie',
        generalEmail: 'contact@example.invalid',
        website: 'https://voorbeeld.nl',
        employeeCount: 25,
      }),
    )
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      'workmatchr-active-organization',
      'organization-id',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    )
    expect(mocks.redirect).toHaveBeenCalledWith('/organisatie?aangemaakt=1')
  })
})
