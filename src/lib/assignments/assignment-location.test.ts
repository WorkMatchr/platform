import { describe, expect, it, vi } from 'vitest'
import {
  assignmentLocationLabel,
  nonRegisteredLocationSnapshot,
  registeredLocationSnapshot,
  resolveAssignmentLocation,
} from './assignment-location'

const organizationId = '00000000-0000-4000-8000-000000000001'
const locationId = '00000000-0000-4000-8000-000000000002'
const registered = {
  id: locationId,
  label: 'Hoofdkantoor',
  addressLine: 'Testlaan 1',
  postalCode: '1234AB',
  city: 'Utrecht',
  province: 'Utrecht',
  countryCode: 'NL',
}

describe('getypeerde opdrachtlocatie', () => {
  it('bevriest een geregistreerde locatie inclusief adresgegevens', () => {
    const snapshot = registeredLocationSnapshot(registered)
    expect(snapshot).toMatchObject({
      locationType: 'REGISTERED',
      locationId,
      locationName: 'Hoofdkantoor',
      locationAddressLine: 'Testlaan 1',
      locationCity: 'Utrecht',
    })
    expect(assignmentLocationLabel(snapshot)).toBe('Hoofdkantoor — Utrecht')
  })

  it.each([
    ['OTHER', { locationCity: 'Eindhoven', locationRegion: null }, 'Eindhoven'],
    ['MULTIPLE', { locationCity: null, locationRegion: 'Noord-Nederland', locationCount: 4 }, 'Meerdere locaties (4)'],
    ['REMOTE', { locationCity: null, locationRegion: null }, 'Volledig op afstand'],
    ['UNKNOWN', { locationCity: null, locationRegion: null }, 'Locatie nog niet bekend'],
  ] as const)('maakt %s zonder OrganizationLocation publiceerbaar', (locationType, values, label) => {
    const snapshot = nonRegisteredLocationSnapshot({
      locationType,
      locationCity: values.locationCity,
      locationRegion: values.locationRegion,
      locationDescription: null,
      locationCount: 'locationCount' in values ? values.locationCount : null,
    })
    expect(snapshot.locationId).toBeNull()
    expect(assignmentLocationLabel(snapshot)).toBe(label)
  })

  it('weigert een andere locatie zonder plaats of regio', () => {
    expect(() => nonRegisteredLocationSnapshot({
      locationType: 'OTHER',
      locationCity: null,
      locationRegion: null,
      locationDescription: null,
      locationCount: null,
    })).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }))
  })

  it('weigert een geregistreerde locatie van een andere tenant', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    await expect(resolveAssignmentLocation(
      { organizationLocation: { findFirst } } as never,
      organizationId,
      {
        locationType: 'REGISTERED',
        locationId,
        locationCity: null,
        locationRegion: null,
        locationDescription: null,
        locationCount: null,
      },
    )).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: locationId, organizationId, archivedAt: null },
    }))
  })
})
