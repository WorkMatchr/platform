import Link from 'next/link'
import { AdminPageHeader, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listPlatformOrganizations, type OrganizationListFilters } from '@/lib/platform-admin/platform-admin-query-service'

const statusLabels = { PENDING: 'In afwachting', ACTIVE: 'Actief', SUSPENDED: 'Geblokkeerd', ARCHIVED: 'Gearchiveerd' } as const
const typeLabels = { CLIENT: 'Opdrachtgever', PROVIDER: 'Dienstverlener', BOTH: 'Beide', PLATFORM_OPERATOR: 'Platform' } as const

export default async function PlatformOrganizationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/organisaties')
  const params = await searchParams
  const filters: OrganizationListFilters = {
    query: params.q,
    status: ['PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(params.status ?? '') ? params.status as OrganizationListFilters['status'] : undefined,
    type: ['CLIENT', 'PROVIDER', 'BOTH'].includes(params.type ?? '') ? params.type as OrganizationListFilters['type'] : undefined,
    sort: ['name', 'newest', 'oldest'].includes(params.sort ?? '') ? params.sort as OrganizationListFilters['sort'] : 'name',
  }
  const organizations = await listPlatformOrganizations(administrator.id, filters)
  return (
    <>
      <AdminPageHeader title="Organisaties" description="Zoek, filter en inspecteer organisaties zonder gegevens rechtstreeks te wijzigen." />
      <FilterForm>
        <FilterField name="q" label="Zoeken" defaultValue={filters.query} />
        <FilterField name="status" label="Status"><select className="min-h-10 rounded-control border border-border px-3" name="status" defaultValue={filters.status ?? ''}><option value="">Alle statussen</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
        <FilterField name="type" label="Type"><select className="min-h-10 rounded-control border border-border px-3" name="type" defaultValue={filters.type ?? ''}><option value="">Alle typen</option>{Object.entries(typeLabels).filter(([value]) => value !== 'PLATFORM_OPERATOR').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
      </FilterForm>
      {organizations.length === 0 ? <EmptyState>Geen organisaties gevonden met deze filters.</EmptyState> : (
        <AdminTable headers={['Organisatie', 'Type', 'Status', 'Locatie', 'Gebruikers', 'Opdrachten', 'Actie']}>
          {organizations.map((organization) => <tr key={organization.id}>
            <td className="px-4 py-3 font-semibold text-brand-dark">{organization.name}</td>
            <td className="px-4 py-3">{typeLabels[organization.organizationType]}</td>
            <td className="px-4 py-3"><StatusPill tone={organization.status === 'ACTIVE' ? 'good' : organization.status === 'SUSPENDED' ? 'bad' : 'warning'}>{statusLabels[organization.status]}</StatusPill></td>
            <td className="px-4 py-3">{organization.locations[0]?.city ?? 'Niet vastgelegd'}</td>
            <td className="px-4 py-3">{organization._count.memberships}</td>
            <td className="px-4 py-3">{organization._count.clientAssignments}</td>
            <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/organisaties/${organization.id}`}>Bekijken</Link></td>
          </tr>)}
        </AdminTable>
      )}
    </>
  )
}
