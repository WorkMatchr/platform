import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { updateAssignmentAction } from '@/app/opdrachten/actions'
import { AssignmentEditForm } from '@/components/assignments/assignment-edit-form'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getAssignmentEditView } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Conceptopdracht bewerken | WorkMatchr' }

export default async function AssignmentEditPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/bewerken`)
  let assignment
  try {
    assignment = await getAssignmentEditView(user.id, activeMembership.organization.id, assignmentId)
  } catch (error) {
    if (error instanceof AssignmentServiceError && error.code === 'INVALID_STATUS') redirect(`/opdrachten/${assignmentId}`)
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }
  return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2">Conceptopdracht bewerken</Heading>
        <p className="mt-3 text-text-secondary">Pas alleen de zakelijke opdrachtgegevens aan. De oorspronkelijke intake en antwoorden blijven ongewijzigd.</p>
        <div className="mt-8 rounded-card border border-border bg-surface p-6 sm:p-8">
          <AssignmentEditForm action={updateAssignmentAction} assignment={assignment} />
        </div>
      </Section>
    )
}
