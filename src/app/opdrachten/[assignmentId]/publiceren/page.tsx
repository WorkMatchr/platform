import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { LegacySimpleAdvicePage } from '@/components/requests/legacy-simple-advice-page'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getAssignmentDetail } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Opdracht publiceren | WorkMatchr' }

export default async function AssignmentPublishPage({ params }: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(
    undefined, `/opdrachten/${assignmentId}/publiceren`,
  )
  let assignment
  try {
    assignment = await getAssignmentDetail(user.id, activeMembership.organization.id, assignmentId)
  } catch (error) {
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }
  if (!assignment.canManage) notFound()
  if (!assignment.publishedAt && assignment.intakeId && ['DRAFT', 'READY_FOR_REVIEW'].includes(assignment.status)) {
    return <LegacySimpleAdvicePage intakeId={assignment.intakeId} />
  }
  redirect(`/opdrachten/${assignment.id}`)
}
