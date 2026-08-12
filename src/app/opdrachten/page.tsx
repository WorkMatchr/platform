import type { Metadata } from 'next'
import { MyAssignmentsOverview } from '@/components/assignments/my-assignments-overview'
import { createIntakeAction } from '@/app/hulpvragen/actions'
import { IntakeStartForm } from '@/components/intakes/intake-start-form'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { getMyAssignmentsOverview } from '@/lib/assignments/my-assignments-overview-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Mijn opdrachten | WorkMatchr' }

export default async function AssignmentOverviewPage() {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/opdrachten')
  const organization = activeMembership.organization

  if (user.accountType !== 'CLIENT' || organization.organizationType !== 'CLIENT') {
    return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2">Opdrachten zijn voor opdrachtgevers</Heading>
        <p className="mt-3 text-text-secondary">De actieve organisatie is ingericht als dienstverlener en kan hier geen opdracht starten.</p>
        <LinkButton href="/organisatie" className="mt-6">Organisatie kiezen</LinkButton>
      </Section>
    )
  }

  const overview = await getMyAssignmentsOverview(user.id, organization.id)

  return (
    <Section spacing="compact">
      <Heading as="h1" size="h2">Mijn opdrachten</Heading>
      <p className="mt-3 max-w-3xl text-text-secondary">Bekijk de voortgang van uw opdrachten en start hier direct een nieuwe opdracht voor {organization.name}.</p>
      {overview.viewerRole === 'MEMBER' && <p className="mt-2 text-sm text-text-secondary">U ziet alleen uw eigen opdrachten.</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)] lg:items-start">
        <aside className="order-1 lg:order-2" aria-labelledby="new-assignment-title">
          <Card>
            <Heading as="h2" size="h3" id="new-assignment-title">Nieuwe opdracht</Heading>
            <p className="mt-3 text-text-secondary">Beschrijf kort uw vraag of situatie. U hoeft nog niet precies te weten welke dienstverlening u nodig heeft.</p>
            <div className="mt-6">
              <IntakeStartForm
                action={createIntakeAction}
                organizationId={organization.id}
                label="Waar heeft u ondersteuning bij nodig?"
                helpText="Beschrijf kort uw vraag of situatie. U hoeft nog niet precies te weten welke dienstverlening u nodig heeft. Vermeld geen namen, medische gegevens, BSN’s, wachtwoorden of andere vertrouwelijke persoonsgegevens."
              />
            </div>
          </Card>
        </aside>
        <section className="order-2 lg:order-1" aria-labelledby="assignments-overview-title">
          <Heading as="h2" size="h3" id="assignments-overview-title">Mijn opdrachten</Heading>
          <div className="mt-5"><MyAssignmentsOverview overview={overview} /></div>
        </section>
      </div>
    </Section>
  )
}
