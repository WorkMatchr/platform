import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createIntakeAction } from '@/app/hulpvragen/actions'
import { IntakeStartForm } from '@/components/intakes/intake-start-form'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Nieuwe hulpvraag | WorkMatchr' }

export default async function NewIntakePage() {
  const { activeMembership } = await requireOrganizationMembership(undefined, '/hulpvragen/nieuw')
  const organization = activeMembership.organization
  if (organization.organizationType === 'PROVIDER') redirect('/hulpvragen')

  return (
    <Section spacing="compact" containerSize="narrow">
      <Heading as="h1" size="h2">Start Uw hulpvraag</Heading>
      <Text className="mt-3 max-w-2xl text-text-secondary">
        Begin in Uw eigen woorden. U hoeft nog niet te weten welke specialist nodig is. De hulpvraag wordt als concept opgeslagen voor {organization.name}.
      </Text>
      <Card className="mt-8">
        <IntakeStartForm action={createIntakeAction} organizationId={organization.id} />
      </Card>
    </Section>
  )
}
