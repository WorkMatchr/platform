import type { Metadata } from 'next'
import { IntakeList } from '@/components/intakes/intake-list'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { listIntakesForOrganization } from '@/lib/intakes/intake-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Uw hulpvragen | WorkMatchr' }

export default async function IntakeOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/hulpvragen')
  const organization = activeMembership.organization
  const query = await searchParams

  if (organization.organizationType === 'PROVIDER') {
    return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2">Hulpvragen zijn voor opdrachtgevers</Heading>
        <Text className="mt-3 text-text-secondary">
          De actieve organisatie is ingericht als aanbieder. Kies een opdrachtgeverorganisatie om een hulpvraag te starten.
        </Text>
        <LinkButton href="/organisatie" className="mt-6">Organisatie kiezen</LinkButton>
      </Section>
    )
  }

  const { items, viewerRole } = await listIntakesForOrganization(user.id, organization.id)
  const notice = query.gearchiveerd === '1'
    ? 'De conceptintake is gearchiveerd.'
    : query.actie === 'mislukt'
      ? 'De intakeactie kon niet worden uitgevoerd. Vernieuw de pagina en probeer het opnieuw.'
      : null

  return (
    <Section spacing="compact">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading as="h1" size="h2">Uw hulpvragen</Heading>
          <Text className="mt-3 max-w-2xl text-text-secondary">
            Start een hulpvraag, werk een concept verder uit of controleer een volledige intake voor {organization.name}.
          </Text>
          {viewerRole === 'MEMBER' && (
            <p className="mt-2 text-sm text-text-secondary">U ziet hier alleen Uw eigen hulpvragen.</p>
          )}
        </div>
        <LinkButton href="/hulpvragen/nieuw" className="shrink-0">Nieuwe hulpvraag</LinkButton>
      </div>
      {notice && (
        <p role="status" className={`mt-6 rounded-control p-3 ${query.actie ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          {notice}
        </p>
      )}
      <div className="mt-8"><IntakeList items={items} /></div>
      <Card variant="subtle" className="mt-8">
        <h2 className="text-lg font-bold text-brand-dark">Wat gebeurt er na deze intake?</h2>
        <p className="mt-2 text-text-secondary">
          U kunt de vraag nu verduidelijken en gereedmaken voor controle. Indienen, opdrachtvorming en matching zijn nog niet actief.
        </p>
      </Card>
    </Section>
  )
}
