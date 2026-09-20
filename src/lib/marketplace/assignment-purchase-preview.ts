import { z } from 'zod'
import { pricingExpertises, expertiseCodeSchema } from './assignment-pricing'

export type AssignmentPreviewSource = Readonly<{
  id: string
  requestId?: string | null
  request?: { requestedStart: string | null } | null
  specialisms?: readonly { isRequired: boolean; specialism: { name: string } }[]
  title: string
  primarySpecialism?: { name: string } | null
  sector?: { name: string } | null
  employeeCount: number | null
  desiredStartDate: Date | null
  responseDeadline: Date | null
  locationCity: string | null
  locationProvince: string | null
  locationRegion: string | null
  locationCount: number | null
  allowsRemoteWork: boolean
  maxSelections: number
}>

export type InvitationMatch = { matchType: 'PRIMARY' | 'ADDITIONAL'; recipientExpertise: string; primaryExpertiseCode: string }
const provinces = ['Drenthe', 'Flevoland', 'Fryslân', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland']
const sectors = ['Bouw', 'Industrie', 'Zorg', 'Onderwijs', 'Overheid', 'Semioverheid', 'Logistiek', 'Zakelijke dienstverlening', 'Detailhandel', 'Horeca', 'Landbouw', 'Overig']
const expertiseLabel = (code: string) => pricingExpertises.find(e => e.code === code)?.label ?? null
export const assignmentPreviewSchema = z.object({
  assignmentId: z.uuid(), kind: z.string(), safeSummary: z.string(),
  expertise: z.string().nullable(), additionalExpertises: z.array(z.string()).optional(),
  matchType: z.enum(['PRIMARY', 'ADDITIONAL']).nullable(), recipientExpertise: z.string().nullable(),
  sector: z.string().nullable(), region: z.string().nullable(),
  requestedStart: z.enum(['AS_SOON_AS_POSSIBLE', 'WITHIN_ONE_MONTH', 'IN_CONSULTATION']).nullable().default(null),
  desiredStartDate: z.coerce.date().nullable(), responseDeadline: z.coerce.date().nullable(),
  employeeCount: z.number().int().nullable(), locationCount: z.number().int().nullable(),
  allowsRemoteWork: z.boolean(), priceCredits: z.number().int().positive(), maximumPurchasers: z.number().int().positive(),
})
export type AssignmentPreview = z.infer<typeof assignmentPreviewSchema>

/** Structured allowlist only. Never derive public copy from titles, descriptions or addresses. */
export function toAssignmentPreview(source: AssignmentPreviewSource, priceCredits: number, match?: InvitationMatch): AssignmentPreview {
  const expertise = match ? expertiseLabel(match.primaryExpertiseCode) : pricingExpertises.find(e => e.label.toLocaleLowerCase('nl') === source.primarySpecialism?.name.toLocaleLowerCase('nl'))?.label ?? null
  const recipientExpertise = match ? expertiseLabel(match.recipientExpertise) : null
  return Object.freeze({
    assignmentId: source.requestId ?? source.id,
    kind: expertise ? `Ondersteuning door een ${expertise.toLocaleLowerCase('nl')}` : 'Arbo-opdracht',
    safeSummary: expertise ? `Gevraagd: ondersteuning op het gebied van ${expertise.toLocaleLowerCase('nl')}. Bekijk de uitvoeringsvorm, planning en regio om te bepalen of deze opdracht bij u past.` : 'Een organisatie zoekt ondersteuning bij gezond en veilig werken. De volledige hulpvraag is beschikbaar na ontgrendeling.',
    expertise, matchType: match?.matchType ?? null, recipientExpertise,
    additionalExpertises: match?.matchType === 'ADDITIONAL' && recipientExpertise ? [recipientExpertise] : [],
    sector: sectors.find(s => s === source.sector?.name) ?? null,
    region: provinces.find(p => p.toLowerCase() === source.locationProvince?.toLowerCase()) ?? null,
    requestedStart: source.request?.requestedStart === 'AS_SOON_AS_POSSIBLE' ? 'AS_SOON_AS_POSSIBLE' : source.request?.requestedStart === 'WITHIN_ONE_MONTH' ? 'WITHIN_ONE_MONTH' : null,
    desiredStartDate: source.desiredStartDate, responseDeadline: source.responseDeadline,
    employeeCount: source.employeeCount, locationCount: source.locationCount,
    allowsRemoteWork: source.allowsRemoteWork, priceCredits,
    maximumPurchasers: source.maxSelections,
  })
}

export function invitationMatchFromFactors(primaryCode: string, explanation: unknown): InvitationMatch {
  expertiseCodeSchema.parse(primaryCode)
  const data = z.object({ factors: z.array(z.object({ key: z.string(), matched: z.boolean(), explanation: z.string() })) }).parse(explanation)
  const primary = data.factors.find(f => f.key === 'PRIMARY_EXPERTISE' && f.matched)
  const additional = data.factors.find(f => f.key === 'ADDITIONAL_EXPERTISE' && f.matched)
  const match = primary ?? additional
  return { primaryExpertiseCode: primaryCode, matchType: !primary && additional ? 'ADDITIONAL' : 'PRIMARY', recipientExpertise: expertiseCodeSchema.parse(match?.explanation ?? primaryCode) }
}

export function assignmentInvitationCopy(preview: AssignmentPreview) {
  const additional = preview.matchType === 'ADDITIONAL'
  const context = [preview.expertise, preview.region, preview.sector].filter(Boolean).join(' · ')
  return Object.freeze({
    title: additional ? 'Nieuwe opdracht mogelijk relevant voor uw deskundigheid' : 'Nieuwe opdracht voor uw deskundigheid',
    body: `${preview.safeSummary}${context ? ` — ${context}` : ''}. ${additional ? `Uw aanvullende deskundigheid: ${preview.recipientExpertise}. ` : ''}Ontgrendelen kost ${preview.priceCredits} credits. Maximaal ${preview.maximumPurchasers} professionals kunnen de opdracht kopen.`,
    cta: 'Bekijk opdracht en beslis',
  })
}

export function assignmentPreviewStart(preview: AssignmentPreview) {
  return preview.desiredStartDate?.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }) ?? (preview.requestedStart === 'AS_SOON_AS_POSSIBLE' ? 'Zo snel mogelijk' : preview.requestedStart === 'WITHIN_ONE_MONTH' ? 'Binnen één maand' : 'In overleg')
}
