import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAssignmentDetail } from '@/lib/assignments/assignment-query-service'
import { LegacySimpleAdvicePage } from '@/components/requests/legacy-simple-advice-page'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getAssignmentEditView } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Opdracht bewerken | WorkMatchr' }

export default async function AssignmentEditPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/bewerken`)
  try {
    await getAssignmentEditView(user.id, activeMembership.organization.id, assignmentId)
  } catch (error) {
    if (error instanceof AssignmentServiceError && error.code === 'INVALID_STATUS') redirect(`/opdrachten/${assignmentId}`)
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }
  const detail = await getAssignmentDetail(user.id, activeMembership.organization.id, assignmentId)
  if (detail.intakeId) return <LegacySimpleAdvicePage intakeId={detail.intakeId} />
  return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2">Opdracht bewerken</Heading>
        <p className="mt-3 text-text-secondary">Pas alleen de zakelijke opdrachtgegevens aan. De oorspronkelijke hulpvraag en antwoorden blijven ongewijzigd.</p>
        <div className="mt-8 rounded-card border border-border bg-surface p-6 sm:p-8">
          <p>Deze opdracht kan hier niet worden gewijzigd. Uw bestaande gegevens blijven bewaard.</p>
        </div>
      </Section>
    )
}
