import Link from 'next/link'
import { AdminPageHeader, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listPlatformUsers, type UserListFilters } from '@/lib/platform-admin/platform-admin-query-service'
import { organizationRoleLabels, userStatusLabels } from '@/lib/presentation/platform-labels'


export default async function PlatformUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/gebruikers')
  const params = await searchParams
  const filters: UserListFilters = {
    query: params.q,
    status: Object.keys(userStatusLabels).includes(params.status ?? '') ? params.status as UserListFilters['status'] : undefined,
    role: Object.keys(organizationRoleLabels).includes(params.role ?? '') ? params.role as UserListFilters['role'] : undefined,
  }
  const users = await listPlatformUsers(administrator.id, filters)
  return (
    <>
      <AdminPageHeader title="Gebruikers" description="Accountstatus, organisatiecontext en laatste sessie. Accountverwijdering valt buiten deze module." />
      <FilterForm>
        <FilterField name="q" label="Naam of e-mailadres" defaultValue={filters.query} />
        <FilterField name="status" label="Accountstatus"><select className="min-h-10 rounded-control border border-border px-3" name="status" defaultValue={filters.status ?? ''}><option value="">Alle statussen</option>{Object.entries(userStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
        <FilterField name="role" label="Organisatierol"><select className="min-h-10 rounded-control border border-border px-3" name="role" defaultValue={filters.role ?? ''}><option value="">Alle rollen</option>{Object.entries(organizationRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
      </FilterForm>
      {users.length === 0 ? <EmptyState>Geen gebruikers gevonden met deze filters.</EmptyState> : (
        <AdminTable headers={['Gebruiker', 'Organisatie', 'Rol', 'Status', 'Laatste sessie', 'Lifecycle']}>
          {users.map((user) => {
            const membership = user.memberships[0]
            return <tr key={user.id}>
              <td className="px-4 py-3"><span className="block font-semibold text-brand-dark">{user.displayName ?? 'Naam niet ingevuld'}</span><span className="break-all text-xs text-text-secondary">{user.email}</span></td>
              <td className="px-4 py-3">{membership?.organization.name ?? 'Platformaccount'}</td>
              <td className="px-4 py-3">{membership ? organizationRoleLabels[membership.role] : user.platformRole === 'ADMIN' ? 'Platformbeheerder' : 'Geen organisatierol'}</td>
              <td className="px-4 py-3"><StatusPill tone={user.status === 'ACTIVE' ? 'good' : user.status === 'BLOCKED' ? 'bad' : 'warning'}>{userStatusLabels[user.status]}</StatusPill></td>
              <td className="px-4 py-3">{user.sessions[0]?.updatedAt.toLocaleString('nl-NL') ?? 'Nog niet ingelogd'}</td>
              <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/gebruikers/${user.id}`}>Bekijken</Link></td>
            </tr>
          })}
        </AdminTable>
      )}
    </>
  )
}
