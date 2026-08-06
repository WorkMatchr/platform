import type { AssignmentLocationType, Prisma } from '@/generated/prisma/client'
import { AssignmentServiceError } from './assignment-errors'

export type AssignmentLocationSnapshot = {
  locationType: AssignmentLocationType
  locationId: string | null
  locationName: string | null
  locationAddressLine: string | null
  locationPostalCode: string | null
  locationCity: string | null
  locationProvince: string | null
  locationCountryCode: string | null
  locationRegion: string | null
  locationDescription: string | null
  locationCount: number | null
  allowsRemoteWork: boolean
}

export type AssignmentLocationItemValue = {
  position: number
  placeOrRegion: string
  normalizedValue: string
}

type EditableLocationInput = {
  locationType: AssignmentLocationType
  locationId: string | null
  locationCity: string | null
  locationRegion: string | null
  locationDescription: string | null
  locationCount: number | null
}

type RegisteredLocation = {
  id: string
  label: string
  addressLine: string
  postalCode: string
  city: string
  province: string | null
  countryCode: string
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function validationError(fieldErrors: Record<string, string[]>) {
  return new AssignmentServiceError(
    'VALIDATION_ERROR',
    'Controleer de locatiegegevens.',
    [],
    fieldErrors,
  )
}

export function registeredLocationSnapshot(location: RegisteredLocation): AssignmentLocationSnapshot {
  return {
    locationType: 'REGISTERED',
    locationId: location.id,
    locationName: location.label,
    locationAddressLine: location.addressLine,
    locationPostalCode: location.postalCode,
    locationCity: location.city,
    locationProvince: location.province,
    locationCountryCode: location.countryCode,
    locationRegion: location.province,
    locationDescription: null,
    locationCount: null,
    allowsRemoteWork: false,
  }
}

export function nonRegisteredLocationSnapshot(
  input: Omit<EditableLocationInput, 'locationId'>,
): AssignmentLocationSnapshot {
  const city = clean(input.locationCity)
  const region = clean(input.locationRegion)
  const description = clean(input.locationDescription)

  if (input.locationType === 'OTHER' && !city && !region) {
    throw validationError({ locationCity: ['Vul een plaats of regio in.'] })
  }
  if (input.locationCount !== null && input.locationCount < 1) {
    throw validationError({ locationCount: ['Vul minimaal één locatie in.'] })
  }

  return {
    locationType: input.locationType,
    locationId: null,
    locationName: null,
    locationAddressLine: null,
    locationPostalCode: null,
    locationCity: city,
    locationProvince: null,
    locationCountryCode: null,
    locationRegion: region,
    locationDescription: description,
    locationCount: input.locationType === 'MULTIPLE' ? input.locationCount : null,
    allowsRemoteWork: input.locationType === 'REMOTE',
  }
}

export async function resolveAssignmentLocation(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  input: EditableLocationInput,
): Promise<AssignmentLocationSnapshot> {
  if (input.locationType === 'REGISTERED') {
    if (!input.locationId) {
      throw validationError({ locationId: ['Kies een bestaande organisatielocatie.'] })
    }
    const location = await transaction.organizationLocation.findFirst({
      where: { id: input.locationId, organizationId, archivedAt: null },
      select: {
        id: true,
        label: true,
        addressLine: true,
        postalCode: true,
        city: true,
        province: true,
        countryCode: true,
      },
    })
    if (!location) {
      throw validationError({ locationId: ['Deze organisatielocatie is niet meer beschikbaar.'] })
    }
    return registeredLocationSnapshot(location)
  }

  return nonRegisteredLocationSnapshot(input)
}

export async function validateAssignmentLocationSnapshot(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  snapshot: AssignmentLocationSnapshot & { locationItems?: readonly AssignmentLocationItemValue[] },
) {
  if (snapshot.locationType === 'REGISTERED') {
    if (!snapshot.locationId || !clean(snapshot.locationName) || !clean(snapshot.locationCity)) {
      throw validationError({ locationId: ['De vastgelegde organisatielocatie is onvolledig.'] })
    }
    const location = await transaction.organizationLocation.findFirst({
      where: { id: snapshot.locationId, organizationId, archivedAt: null },
      select: { id: true },
    })
    if (!location) {
      throw validationError({ locationId: ['Deze organisatielocatie is niet meer beschikbaar.'] })
    }
    return
  }

  if (snapshot.locationId) {
    throw validationError({ locationType: ['Deze locatievorm mag geen organisatielocatie gebruiken.'] })
  }
  if (snapshot.locationType === 'OTHER' && !clean(snapshot.locationCity) && !clean(snapshot.locationRegion)) {
    throw validationError({ locationCity: ['Vul een plaats of regio in.'] })
  }
  if (snapshot.locationCount !== null && snapshot.locationCount < 1) {
    throw validationError({ locationCount: ['Vul minimaal één locatie in.'] })
  }
  const items = snapshot.locationItems ?? []
  if (snapshot.locationType === 'MULTIPLE') {
    if (items.length < 2 || items.length > 25 || snapshot.locationCount !== items.length) {
      throw validationError({ locationItems: ['Vul minimaal twee en maximaal 25 unieke plaatsen of regio’s in.'] })
    }
    const unique = new Set(items.map((item) => item.normalizedValue))
    if (unique.size !== items.length || items.some((item, index) => item.position !== index + 1)) {
      throw validationError({ locationItems: ['Controleer de volgorde en verwijder dubbele plaatsen of regio’s.'] })
    }
  } else if (items.length > 0) {
    throw validationError({ locationItems: ['Deze locatievorm mag geen lijst met plaatsen of regio’s bevatten.'] })
  }
}

export function assignmentLocationLabel(
  snapshot: AssignmentLocationSnapshot,
  locationItems: readonly Pick<AssignmentLocationItemValue, 'placeOrRegion'>[] = [],
): string {
  switch (snapshot.locationType) {
    case 'REGISTERED':
      return [snapshot.locationName, snapshot.locationCity].filter(Boolean).join(' — ')
        || 'Bestaande organisatielocatie'
    case 'OTHER':
      return [snapshot.locationCity, snapshot.locationRegion].filter(Boolean).join(', ')
        || 'Andere locatie'
    case 'MULTIPLE':
      return locationItems.length > 0
        ? locationItems.map((item) => item.placeOrRegion).join(', ')
        : snapshot.locationCount
          ? `Meerdere locaties (${snapshot.locationCount.toLocaleString('nl-NL')})`
          : 'Meerdere locaties'
    case 'REMOTE':
      return 'Volledig op afstand'
    case 'UNKNOWN':
      return 'Locatie nog niet bekend'
  }
}
