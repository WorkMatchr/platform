import { AdminPageHeader, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import type { AssignmentStatus } from '@/generated/prisma/enums'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listPlatformAssignments, type AssignmentListFilters } from '@/lib/platform-admin/platform-admin-query-service'

const statuses: AssignmentStatus[] = ['DRAFT', 'READY_FOR_REVIEW', 'OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION', 'AWARDED', 'CLOSED', 'CANCELLED', 'ARCHIVED']

export default async function PlatformAssignmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/opdrachten')
  const params = await searchParams
  const filters: AssignmentListFilters = {
    query: params.q,
    status: statuses.includes(params.status as AssignmentStatus) ? params.status as AssignmentStatus : undefined,
    sector: params.sector,
    specialism: params.specialism,
    age: ['7', '14', '30'].includes(params.age ?? '') ? params.age as AssignmentListFilters['age'] : undefined,
  }
  const assignments = await listPlatformAssignments(administrator.id, filters)
  return (
    <>
      <AdminPageHeader title="Opdrachten" description="Operationeel overzicht met status, ouderdom, reacties en gunning." />
      <FilterForm>
        <FilterField name="q" label="Titel of organisatie" defaultValue={filters.query} />
        <FilterField name="status" label="Status"><select className="min-h-10 rounded-control border border-border px-3" name="status" defaultValue={filters.status ?? ''}><option value="">Alle statussen</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></FilterField>
        <FilterField name="sector" label="Sectorslug" defaultValue={filters.sector} />
        <FilterField name="specialism" label="Specialismeslug" defaultValue={filters.specialism} />
        <FilterField name="age" label="Minimaal open"><select className="min-h-10 rounded-control border border-border px-3" name="age" defaultValue={filters.age ?? ''}><option value="">Alle leeftijden</option><option value="7">7 dagen</option><option value="14">14 dagen</option><option value="30">30 dagen</option></select></FilterField>
      </FilterForm>
      {assignments.length === 0 ? <EmptyState>Geen opdrachten gevonden met deze filters.</EmptyState> : (
        <AdminTable headers={['Opdracht', 'Opdrachtgever', 'Status', 'Sector', 'Geselecteerd', 'Reacties', 'Open sinds']}>
          {assignments.map((assignment) => <tr key={assignment.id}>
            <td className="px-4 py-3 font-semibold text-brand-dark">{assignment.title}</td>
            <td className="px-4 py-3">{assignment.clientOrganization.name}</td>
            <td className="px-4 py-3"><StatusPill tone={assignment.status === 'AWARDED' || assignment.status === 'CLOSED' ? 'good' : assignment.status === 'CANCELLED' ? 'bad' : 'neutral'}>{assignment.status}</StatusPill></td>
            <td className="px-4 py-3">{assignment.sector?.name ?? 'Niet vastgelegd'}</td>
            <td className="px-4 py-3">{assignment._count.providerSelections}</td>
            <td className="px-4 py-3">{assignment._count.marketplaceQuotes}</td>
            <td className="px-4 py-3">{assignment.publishedAt?.toLocaleDateString('nl-NL') ?? assignment.createdAt.toLocaleDateString('nl-NL')}</td>
          </tr>)}
        </AdminTable>
      )}
    </>
  )
}
