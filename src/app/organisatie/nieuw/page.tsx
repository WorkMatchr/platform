import type { Metadata } from 'next'
import { createOrganizationAction } from '@/app/organisatie/actions'
import { OrganizationForm } from '@/components/organizations/organization-form'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Section } from '@/components/layout/section'
import { requireUser } from '@/lib/authorization'
import { redirect } from 'next/navigation'
import { organizationTypeForAccountType } from '@/lib/account-types/account-type-policy'
import { getOrganizationSectorOptions } from '@/lib/organizations/organization-sector-options'

export const metadata: Metadata = { title: 'Organisatie aanmaken | WorkMatchr' }

export default async function NewOrganizationPage() {
  const user = await requireUser()
  if (!user.accountType) redirect('/account')
  const sectors = await getOrganizationSectorOptions()
  return <Section spacing="compact" containerSize="narrow"><div className="mb-8"><Heading as="h1" size="h2">Vertel ons over uw organisatie</Heading><Text className="mt-3 max-w-2xl text-text-secondary">Met deze gegevens richten wij uw WorkMatchr-omgeving in. Verplichte velden zijn gemarkeerd met een ster.</Text></div><Card><OrganizationForm action={createOrganizationAction} fixedOrganizationType={organizationTypeForAccountType(user.accountType)} mode="create" sectors={sectors} /></Card></Section>
}
