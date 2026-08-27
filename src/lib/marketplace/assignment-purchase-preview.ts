export const ASSIGNMENT_PURCHASE_PRICE_CREDITS = 25

export type AssignmentPreviewSource = Readonly<{
  id: string
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

export type AssignmentPreview = Readonly<{
  assignmentId: string
  kind: string
  safeSummary: string
  expertise: string | null
  sector: string | null
  region: string | null
  desiredStartDate: Date | null
  responseDeadline: Date | null
  employeeCount: number | null
  locationCount: number | null
  allowsRemoteWork: boolean
  priceCredits: 25
  maximumPurchasers: number
}>

/** Server-side allowlist: the full description and client/contact/location details never enter this projection. */
export function toAssignmentPreview(source: AssignmentPreviewSource): AssignmentPreview {
  return Object.freeze({
    assignmentId: source.id,
    kind: source.primarySpecialism?.name ?? 'Arbo-opdracht',
    safeSummary: source.title,
    expertise: source.primarySpecialism?.name ?? null,
    sector: source.sector?.name ?? null,
    region: source.locationRegion ?? source.locationProvince ?? source.locationCity,
    desiredStartDate: source.desiredStartDate,
    responseDeadline: source.responseDeadline,
    employeeCount: source.employeeCount,
    locationCount: source.locationCount,
    allowsRemoteWork: source.allowsRemoteWork,
    priceCredits: ASSIGNMENT_PURCHASE_PRICE_CREDITS,
    maximumPurchasers: source.maxSelections,
  })
}

export function assignmentInvitationCopy(preview: AssignmentPreview) {
  const context = [preview.expertise, preview.region, preview.sector].filter(Boolean).join(' · ')
  return Object.freeze({
    title: 'Nieuwe opdracht voor uw expertise',
    body: `${preview.safeSummary}${context ? ` — ${context}` : ''}. Deze opdracht kost 25 credits. Maximaal ${preview.maximumPurchasers} professionals kunnen de opdracht kopen.`,
    cta: 'Bekijk opdracht en beslis',
  })
}
