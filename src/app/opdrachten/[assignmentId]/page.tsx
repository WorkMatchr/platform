import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AssignmentDetail } from '@/components/assignments/assignment-detail'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getAssignmentDetail } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { cancelAssignmentAction, markAssignmentReadyAction, reopenAssignmentAction } from '@/app/opdrachten/actions'

export const metadata: Metadata = { title: 'Conceptopdracht | WorkMatchr' }

export default async function AssignmentDetailPage({ params, searchParams }: { params: Promise<{ assignmentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}`)
  let assignment
  try {
    assignment = await getAssignmentDetail(user.id, activeMembership.organization.id, assignmentId)
  } catch (error) {
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }
  const query = await searchParams
  const notice = query.gewijzigd === '1'
    ? 'De wijzigingen zijn opgeslagen.'
    : query.status === 'gereed'
      ? 'De opdracht staat intern gereed voor controle.'
      : query.status === 'concept'
        ? 'De opdracht is teruggezet naar concept.'
        : query.status === 'geannuleerd'
          ? 'De opdracht is geannuleerd. De historie blijft bewaard.'
          : null

  return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2" className="break-words">{assignment.title}</Heading>
        <p className="mt-3 text-text-secondary">Bekijk de gegevens en herkomst van deze conceptopdracht.</p>
        {notice && <p role="status" className="mt-6 rounded-control bg-success/10 p-4 text-success">{notice}</p>}
        <div className="mt-8"><AssignmentDetail assignment={assignment} actions={{ ready: markAssignmentReadyAction, reopen: reopenAssignmentAction, cancel: cancelAssignmentAction }} /></div>
      </Section>
    )
}
