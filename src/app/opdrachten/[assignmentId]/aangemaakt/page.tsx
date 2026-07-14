import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AssignmentStatusBadge } from '@/components/assignments/assignment-status-badge'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { formatAssignmentDate } from '@/lib/assignments/assignment-presentation'
import { getAssignmentDetail } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Hulpvraag ingediend | WorkMatchr' }

export default async function AssignmentCreatedPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/aangemaakt`)
  let assignment
  try {
    assignment = await getAssignmentDetail(user.id, activeMembership.organization.id, assignmentId)
  } catch (error) {
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }

  return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2">Uw hulpvraag is ingediend</Heading>
        <p className="mt-3 max-w-2xl text-text-secondary">
          WorkMatchr heeft Uw hulpvraag omgezet naar een conceptopdracht. U kunt de opdracht nu bekijken en later verder voorbereiden.
        </p>
        <Card className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AssignmentStatusBadge status={assignment.status} />
            <time className="text-sm text-text-secondary" dateTime={assignment.createdAt}>{formatAssignmentDate(assignment.createdAt)}</time>
          </div>
          <p className="mt-5 text-sm font-semibold text-text-secondary">Conceptopdracht</p>
          <h2 className="mt-1 break-words text-xl font-bold text-brand-dark">{assignment.title}</h2>
          <p className="mt-3 text-text-secondary">Voor {assignment.organizationName}</p>
          <p className="mt-5 rounded-control bg-success/10 p-4 text-success">De oorspronkelijke intake en antwoorden zijn veilig bewaard.</p>
        </Card>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <LinkButton href={`/opdrachten/${assignment.id}`}>Bekijk de opdracht</LinkButton>
          <LinkButton href="/opdrachten" variant="outline">Naar mijn opdrachten</LinkButton>
        </div>
      </Section>
    )
}
