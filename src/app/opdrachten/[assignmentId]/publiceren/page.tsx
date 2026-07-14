import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { publishAssignmentAction } from '@/app/opdrachten/actions'
import { AssignmentPublishForm } from '@/components/assignments/assignment-publication-actions'
import { AssignmentStatusBadge } from '@/components/assignments/assignment-status-badge'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import {
  formatOptionalAssignmentDate,
} from '@/lib/assignments/assignment-presentation'
import { getAssignmentDetail } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = {
  title: 'Opdracht publiceren | WorkMatchr',
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-text-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-text-primary">{value}</dd>
    </div>
  )
}

export default async function AssignmentPublishPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(
    undefined,
    `/opdrachten/${assignmentId}/publiceren`,
  )

  let assignment
  try {
    assignment = await getAssignmentDetail(
      user.id,
      activeMembership.organization.id,
      assignmentId,
    )
  } catch (error) {
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }

  if (!assignment.canManage) notFound()
  if (assignment.status === 'OPEN') redirect(`/opdrachten/${assignment.id}`)
  if (assignment.status !== 'READY_FOR_REVIEW') {
    redirect(`/opdrachten/${assignment.id}`)
  }

  return (
    <Section spacing="compact" containerSize="narrow">
      <Heading as="h1" size="h2">
        Publicatie controleren
      </Heading>
      <p className="mt-3 max-w-3xl text-text-secondary">
        Controleer de definitieve opdrachtgegevens. Na publicatie kan de inhoud
        niet meer worden gewijzigd.
      </p>

      <div className="mt-8 space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AssignmentStatusBadge status={assignment.status} />
            <span className="text-sm text-text-secondary">
              Versie {assignment.version}
            </span>
          </div>
          <h2 className="mt-6 text-xl font-bold text-brand-dark">
            {assignment.title}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-text-primary">
            {assignment.description}
          </p>
          <dl className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
            <Detail label="Organisatie" value={assignment.organizationName} />
            <Detail
              label="Locatie"
              value={
                assignment.location ??
                (assignment.allowsRemoteWork
                  ? 'Op afstand mogelijk'
                  : 'Niet ingevuld')
              }
            />
            <Detail
              label="Gewenste startdatum"
              value={formatOptionalAssignmentDate(assignment.desiredStartDate)}
            />
            <Detail
              label="Betrokken medewerkers"
              value={
                assignment.employeeCount?.toLocaleString('nl-NL') ??
                'Niet ingevuld'
              }
            />
            <Detail
              label="Sector"
              value={assignment.sectorName ?? 'Niet ingevuld'}
            />
            <Detail
              label="Werken op afstand"
              value={assignment.allowsRemoteWork ? 'Mogelijk' : 'Niet mogelijk'}
            />
          </dl>
        </Card>

        <Card variant="subtle">
          <h2 className="text-xl font-bold text-brand-dark">
            Wat publicatie betekent
          </h2>
          <ul className="mt-4 space-y-2 text-text-secondary">
            <li>De opdracht krijgt de status Gepubliceerd.</li>
            <li>De vastgelegde versie staat gereed voor marktverwerking.</li>
            <li>De opdracht wordt nog niet aan aanbieders getoond.</li>
            <li>Matching, credits en betalingen starten niet.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-brand-dark">
            Definitief publiceren
          </h2>
          <p className="mt-2 text-text-secondary">
            WorkMatchr controleert alle publicatievoorwaarden opnieuw op de
            server. Ontbrekende of intussen gewijzigde gegevens worden veilig
            gemeld.
          </p>
          <div className="mt-5">
            <AssignmentPublishForm
              action={publishAssignmentAction}
              assignmentId={assignment.id}
              version={assignment.version}
            />
          </div>
        </Card>

        <LinkButton href={`/opdrachten/${assignment.id}`} variant="outline">
          Terug naar opdracht
        </LinkButton>
      </div>
    </Section>
  )
}
