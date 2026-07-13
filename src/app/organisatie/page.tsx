import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Section } from '@/components/layout/section'
import { OrganizationLogo } from '@/components/organizations/organization-logo'
import { OrganizationSwitcher } from '@/components/organizations/organization-switcher'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { canManageOrganization } from '@/lib/organizations/organization-policy'

export const metadata: Metadata = { title: 'Uw organisatie | WorkMatchr' }
const typeLabels = { CLIENT: 'Opdrachtgever', PROVIDER: 'Aanbieder', BOTH: 'Opdrachtgever en aanbieder' } as const
const statusLabels = { PENDING: 'In afwachting', ACTIVE: 'Actief', SUSPENDED: 'Geschorst', ARCHIVED: 'Gearchiveerd' } as const
const roleLabels = { OWNER: 'Eigenaar', ADMIN: 'Beheerder', MEMBER: 'Lid' } as const
const providerLabels = { DRAFT: 'Concept', PENDING_REVIEW: 'In beoordeling', APPROVED: 'Goedgekeurd', REJECTED: 'Afgewezen', SUSPENDED: 'Geschorst' } as const

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { activeMembership, memberships } = await requireOrganizationMembership()
  const organization = activeMembership.organization
  const location = organization.locations.find((item) => item.isPrimary) ?? organization.locations[0]
  const manageable = canManageOrganization(activeMembership.role, activeMembership.status, organization.status)
  const query = await searchParams
  const notice = query.aangemaakt === '1' ? 'Uw organisatie is aangemaakt.' : query.gewijzigd === '1' ? 'De organisatiegegevens zijn bijgewerkt.' : query.toegang ? 'Deze organisatieactie is niet toegestaan.' : null
  return <Section spacing="compact"><div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-5"><OrganizationLogo name={organization.name} storageKey={organization.logoStorageKey} width={organization.logoWidth} height={organization.logoHeight} /><div><Badge variant={organization.status === 'ACTIVE' ? 'success' : 'neutral'}>{statusLabels[organization.status]}</Badge><Heading as="h1" size="h2" className="mt-3">{organization.name}</Heading>{organization.tradeName && <p className="mt-1 text-text-secondary">Handelsnaam: {organization.tradeName}</p>}</div></div><div className="flex flex-wrap gap-3">{manageable && <LinkButton href="/organisatie/profiel">Profiel wijzigen</LinkButton>}<LinkButton href="/organisatie/nieuw" variant="outline">Organisatie toevoegen</LinkButton></div></div>{notice && <p role="status" className="mt-6 rounded-control bg-brand-primary-subtle p-3 text-brand-dark">{notice}</p>}<div className="mt-8"><OrganizationSwitcher activeOrganizationId={organization.id} organizations={memberships.map((membership) => ({ id: membership.organization.id, name: membership.organization.name }))} /></div><Card className="mt-8"><dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Type" value={typeLabels[organization.organizationType]} /><Detail label="Uw rol" value={roleLabels[activeMembership.role]} /><Detail label="KvK-nummer" value={organization.chamberOfCommerceNumber} /><Detail label="Website" value={organization.website} link /><Detail label="Telefoon" value={organization.phone} /><Detail label="Algemeen e-mailadres" value={organization.generalEmail} /><Detail label="Aantal medewerkers" value={organization.employeeCount?.toLocaleString('nl-NL')} /><Detail label="Primaire locatie" value={location ? `${location.addressLine}, ${location.postalCode} ${location.city}, ${location.countryCode}` : null} /><Detail label="Sectoren" value={organization.sectors.map((item) => `${item.sector.name}${item.isPrimary ? ' (primair)' : ''}`).join(', ')} />{organization.providerProfile && <Detail label="Aanbiederstatus" value={providerLabels[organization.providerProfile.approvalStatus]} />}</dl></Card></Section>
}

function Detail({ label, value, link = false }: { label: string; value?: string | null; link?: boolean }) {
  return <div><dt className="text-sm font-semibold text-text-secondary">{label}</dt><dd className="mt-1 font-medium">{value ? link ? <a className="text-brand-primary-hover underline underline-offset-4" href={value} target="_blank" rel="noreferrer">{value}</a> : value : 'Niet ingevuld'}</dd></div>
}
