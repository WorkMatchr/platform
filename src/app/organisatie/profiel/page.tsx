import type { Metadata } from 'next'
import { updateOrganizationAction } from '@/app/organisatie/actions'
import { OrganizationForm } from '@/components/organizations/organization-form'
import { LogoManager } from '@/components/organizations/logo-manager'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Section } from '@/components/layout/section'
import { requireManageableOrganization } from '@/lib/organizations/organization-authorization'
import { getPrisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Organisatieprofiel wijzigen | WorkMatchr' }

export default async function OrganizationProfilePage() {
  const { activeMembership } = await requireManageableOrganization()
  const organization = activeMembership.organization
  const location = organization.locations.find((item) => item.isPrimary) ?? organization.locations[0]
  const sectors = await getPrisma().sector.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const primarySector = organization.sectors.find((item) => item.isPrimary)
  return <Section spacing="compact" containerSize="narrow"><div className="mb-8"><Heading as="h1" size="h2">Uw organisatieprofiel</Heading><Text className="mt-3 text-text-secondary">Werk de zakelijke gegevens bij. Contactvelden worden niet automatisch openbaar gemaakt.</Text></div><Card className="mb-6"><LogoManager organization={organization} /></Card><Card><OrganizationForm action={updateOrganizationAction} mode="edit" sectors={sectors} initialValues={{ id: organization.id, name: organization.name, tradeName: organization.tradeName, organizationType: organization.organizationType, chamberOfCommerceNumber: organization.chamberOfCommerceNumber, generalEmail: organization.generalEmail, phone: organization.phone, website: organization.website, employeeCount: organization.employeeCount, sectorIds: organization.sectors.map((item) => item.sectorId), primarySectorId: primarySector?.sectorId, addressLine: location?.addressLine, postalCode: location?.postalCode, city: location?.city, province: location?.province, countryCode: location?.countryCode }} /></Card></Section>
}
