import { z } from 'zod'

const plainText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is verplicht.`)
    .max(max, `${label} mag maximaal ${max} tekens bevatten.`)
    .refine((value) => !/[<>]/.test(value) && !/javascript:/i.test(value), `${label} bevat ongeldige tekens.`)

const optionalPlainText = (label: string, max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .trim()
      .max(max, `${label} mag maximaal ${max} tekens bevatten.`)
      .refine((value) => !/[<>]/.test(value) && !/javascript:/i.test(value), `${label} bevat ongeldige tekens.`)
      .optional(),
  )

function normalizeWebsite(value: unknown): unknown {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function normalizePostalCode(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  const dutch = trimmed.replace(/\s+/g, '').match(/^(\d{4})([a-zA-Z]{2})$/)
  return dutch ? `${dutch[1]} ${dutch[2].toUpperCase()}` : trimmed.toUpperCase()
}

export const organizationTypeSchema = z.enum(['CLIENT', 'PROVIDER', 'BOTH'])

export const organizationProfileSchema = z
  .object({
    name: plainText('Officiële organisatienaam', 2, 160),
    tradeName: optionalPlainText('Handelsnaam', 160),
    chamberOfCommerceNumber: optionalPlainText('KvK-nummer', 32),
    generalEmail: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().trim().toLowerCase().email('Vul een geldig algemeen e-mailadres in.').max(254).optional(),
    ),
    phone: optionalPlainText('Telefoonnummer', 32),
    website: z.preprocess(
      normalizeWebsite,
      z
        .string()
        .url('Vul een geldige website in.')
        .max(2048)
        .refine((value) => {
          try {
            return ['http:', 'https:'].includes(new URL(value).protocol)
          } catch {
            return false
          }
        }, 'Alleen http- en https-websites zijn toegestaan.')
        .optional(),
    ),
    employeeCount: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int('Aantal medewerkers moet een geheel getal zijn.').nonnegative('Aantal medewerkers kan niet negatief zijn.').max(10_000_000).optional(),
    ),
    sectorIds: z.array(z.string().uuid()).min(1, 'Selecteer minimaal één sector.').max(12),
    primarySectorId: z.string().uuid('Kies een primaire sector.'),
    addressLine: plainText('Adresregel', 2, 200),
    postalCode: z.preprocess(normalizePostalCode, plainText('Postcode', 2, 20)),
    city: plainText('Plaats', 2, 100),
    province: optionalPlainText('Provincie', 100),
    countryCode: z.string().trim().length(2, 'Landcode bestaat uit twee letters.').regex(/^[a-zA-Z]{2}$/, 'Landcode bestaat uit twee letters.').transform((value) => value.toUpperCase()),
  })
  .superRefine((value, context) => {
    if (!value.sectorIds.includes(value.primarySectorId)) {
      context.addIssue({ code: 'custom', path: ['primarySectorId'], message: 'De primaire sector moet ook geselecteerd zijn.' })
    }
  })

export const createOrganizationSchema = organizationProfileSchema.and(
  z.object({
    organizationType: organizationTypeSchema,
    acceptedBusinessAccuracy: z.literal('on', { error: 'Bevestig dat de zakelijke gegevens correct zijn.' }),
  }),
)

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export function organizationFormData(formData: FormData): Record<string, unknown> {
  return {
    name: formData.get('name'),
    tradeName: formData.get('tradeName'),
    organizationType: formData.get('organizationType'),
    chamberOfCommerceNumber: formData.get('chamberOfCommerceNumber'),
    generalEmail: formData.get('generalEmail'),
    phone: formData.get('phone'),
    website: formData.get('website'),
    employeeCount: formData.get('employeeCount'),
    sectorIds: formData.getAll('sectorIds'),
    primarySectorId: formData.get('primarySectorId'),
    addressLine: formData.get('addressLine'),
    postalCode: formData.get('postalCode'),
    city: formData.get('city'),
    province: formData.get('province'),
    countryCode: formData.get('countryCode'),
    acceptedBusinessAccuracy: formData.get('acceptedBusinessAccuracy'),
  }
}
