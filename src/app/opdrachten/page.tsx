import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AssignmentList } from '@/components/assignments/assignment-list'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { listAssignmentsForOrganization, type AssignmentListFilter } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Mijn opdrachten | WorkMatchr' }

const filters: Array<{ value: AssignmentListFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Concept' },
  { value: 'cancelled', label: 'Geannuleerd' },
]

export default async function AssignmentOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/opdrachten')
  const query = await searchParams
  const selected = typeof query.status === 'string' && filters.some((filter) => filter.value === query.status)
    ? query.status as AssignmentListFilter
    : 'all'

  let result
  try {
    result = await listAssignmentsForOrganization(user.id, activeMembership.organization.id, selected)
  } catch (error) {
    if (error instanceof AssignmentServiceError) notFound()
    throw error
  }

  return (
      <Section spacing="compact">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Heading as="h1" size="h2">Mijn opdrachten</Heading>
            <p className="mt-3 max-w-2xl text-text-secondary">Bekijk de conceptopdrachten van {activeMembership.organization.name}.</p>
            {result.viewerRole === 'MEMBER' && <p className="mt-2 text-sm text-text-secondary">U ziet alleen opdrachten die uit Uw eigen hulpvragen zijn gevormd.</p>}
          </div>
          <LinkButton href="/hulpvragen/nieuw">Nieuwe hulpvraag</LinkButton>
        </div>

        <nav aria-label="Opdrachten filteren" className="mt-7 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <LinkButton key={filter.value} href={filter.value === 'all' ? '/opdrachten' : `/opdrachten?status=${filter.value}`} variant={selected === filter.value ? 'secondary' : 'outline'}>
              {filter.label}
            </LinkButton>
          ))}
        </nav>
        <div className="mt-8"><AssignmentList items={result.items} /></div>
      </Section>
    )
}
