export const MIN_MULTIPLE_LOCATIONS = 2
export const MAX_MULTIPLE_LOCATIONS = 25
export const MAX_LOCATION_VALUE_LENGTH = 120
export const MAX_MULTIPLE_LOCATIONS_SERIALIZED_LENGTH = 1500

export type MultipleLocationValidation = {
  values: string[]
  serialized: string
  errors: Record<number, string>
  generalError?: string
}

export function parseMultipleLocations(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string' || !value) return []
  return value.split(/\r?\n/)
}

export function validateMultipleLocations(value: unknown): MultipleLocationValidation {
  const submitted = parseMultipleLocations(value).slice(0, MAX_MULTIPLE_LOCATIONS + 1)
  const values = submitted.map((entry) => entry.trim())
  const errors: Record<number, string> = {}
  const seen = new Map<string, number>()

  values.forEach((entry, index) => {
    if (!entry) errors[index] = 'Vul een plaats of regio in.'
    else if (entry.length > MAX_LOCATION_VALUE_LENGTH) errors[index] = `Gebruik maximaal ${MAX_LOCATION_VALUE_LENGTH} tekens.`
    const normalized = entry.toLocaleLowerCase('nl-NL')
    const firstIndex = seen.get(normalized)
    if (entry && firstIndex !== undefined) {
      errors[index] = 'Deze plaats of regio staat al in de lijst.'
      errors[firstIndex] ??= 'Deze plaats of regio staat dubbel in de lijst.'
    } else if (entry) {
      seen.set(normalized, index)
    }
  })

  let generalError: string | undefined
  if (values.length < MIN_MULTIPLE_LOCATIONS) generalError = 'Vul minimaal twee plaatsen of regio’s in.'
  else if (values.length > MAX_MULTIPLE_LOCATIONS) generalError = `Vul maximaal ${MAX_MULTIPLE_LOCATIONS} plaatsen of regio’s in.`

  const serialized = values.join('\n')
  if (serialized.length > MAX_MULTIPLE_LOCATIONS_SERIALIZED_LENGTH) {
    generalError = `De volledige locatielijst mag maximaal ${MAX_MULTIPLE_LOCATIONS_SERIALIZED_LENGTH} tekens bevatten.`
  }

  return { values, serialized, errors, generalError }
}

export function locationItemsFromSerialized(value: string | null | undefined) {
  const validation = validateMultipleLocations(value ?? '')
  if (validation.generalError || Object.keys(validation.errors).length > 0) return []
  return validation.values.map((placeOrRegion, index) => ({
    position: index + 1,
    placeOrRegion,
    normalizedValue: placeOrRegion.toLocaleLowerCase('nl-NL'),
  }))
}
