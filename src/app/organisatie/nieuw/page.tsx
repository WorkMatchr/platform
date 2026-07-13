import type { Metadata } from 'next'
import { createOrganizationAction } from '@/app/organisatie/actions'
import { OrganizationForm } from '@/components/organizations/organization-form'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Section } from '@/components/layout/section'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Organisatie aanmaken | WorkMatchr' }

export default async function NewOrganizationPage() {
  await requireUser()
  const sectors = await getPrisma().sector.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  return <Section spacing="compact" containerSize="narrow"><div className="mb-8"><Heading as="h1" size="h2">Vertel ons over Uw organisatie</Heading><Text className="mt-3 max-w-2xl text-text-secondary">Met deze gegevens richten wij Uw WorkMatchr-omgeving in. Verplichte velden zijn gemarkeerd met een ster.</Text></div><Card><OrganizationForm action={createOrganizationAction} mode="create" sectors={sectors} /></Card></Section>
}
