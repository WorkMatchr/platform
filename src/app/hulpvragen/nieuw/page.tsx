import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createIntakeAction } from '@/app/hulpvragen/actions'
import { IntakeStartForm } from '@/components/intakes/intake-start-form'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'

export const metadata: Metadata = { title: 'Nieuwe opdracht | WorkMatchr' }

export default async function NewIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string | string[] }>
}) {
  const { activeMembership } = await requireOrganizationMembership(undefined, '/hulpvragen/nieuw')
  const organization = activeMembership.organization
  if (organization.organizationType === 'PROVIDER') redirect('/hulpvragen')
  const contextValue = (await searchParams).context
  const knowledgeContext = resolveActiveKnowledgeContext(
    Array.isArray(contextValue) ? contextValue[0] : contextValue,
  )

  return (
    <Section spacing="compact" containerSize="narrow">
      <Heading as="h1" size="h2">Start een nieuwe opdracht</Heading>
      <Text className="mt-3 max-w-2xl text-text-secondary">
        Beschrijf uw hulpvraag in uw eigen woorden. U hoeft nog niet te weten welke professional nodig is. Uw antwoorden worden automatisch bewaard voor {organization.name}.
      </Text>
      {knowledgeContext && (
        <div className="mt-6 rounded-card border border-brand-primary/25 bg-brand-primary-subtle p-5">
          <p className="font-bold text-brand-dark">{knowledgeContext.assignmentIntro}</p>
          <p className="mt-2 text-sm text-text-secondary">Beschrijf kort uw situatie en wat binnen uw organisatie speelt. U kunt de voorgestelde richting tijdens het invullen bevestigen of corrigeren.</p>
        </div>
      )}
      <Card className="mt-8">
        <IntakeStartForm action={createIntakeAction} organizationId={organization.id} knowledgeContextId={knowledgeContext?.id} />
      </Card>
    </Section>
  )
}
