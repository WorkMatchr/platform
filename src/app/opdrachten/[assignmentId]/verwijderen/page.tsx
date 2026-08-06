import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { archiveAssignmentAction } from '@/app/opdrachten/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getAssignmentDetail } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Opdracht verwijderen | WorkMatchr' }

export default async function DeleteAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  const context = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/verwijderen`)
  let assignment
  try {
    assignment = await getAssignmentDetail(context.user.id, context.activeMembership.organization.id, assignmentId)
  } catch (error) {
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }
  if (!assignment.canManage) notFound()
  if (!['DRAFT', 'READY_FOR_REVIEW'].includes(assignment.status) || assignment.publishedAt) redirect('/opdrachten')

  return (
    <Section spacing="compact" containerSize="narrow">
      <Heading as="h1" size="h2">Opdracht verwijderen</Heading>
      <Card className="mt-6">
        <p className="font-semibold text-brand-dark">Weet u zeker dat u deze nooit gepubliceerde opdracht wilt verwijderen?</p>
        <p className="mt-3 text-text-secondary">De opdracht verdwijnt uit uw overzicht. Revisies, audit- en statushistorie blijven bewaard.</p>
        <p className="mt-4 rounded-control bg-surface-subtle p-4 font-semibold text-brand-dark">{assignment.title}</p>
        <form action={archiveAssignmentAction} className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <input type="hidden" name="expectedAssignmentVersion" value={assignment.version} />
          <LinkButton href="/opdrachten" variant="outline">Annuleren</LinkButton>
          <Button type="submit" variant="outline">Opdracht verwijderen</Button>
        </form>
      </Card>
    </Section>
  )
}
