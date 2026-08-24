import { addPlatformOrganizationOwnerAction, changePlatformUserStatusAction } from '@/app/platformbeheer/actions'
import { AdminSection, AdminTable } from '@/components/platform-admin/platform-admin-ui'
import { membershipStatusLabels, organizationRoleLabels, userStatusLabels } from '@/lib/presentation/platform-labels'

type OrganizationUsers = {
  id: string
  status: string
  memberships: Array<{
    id: string
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
    status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
    user: {
      id: string
      displayName: string | null
      email: string
      status: 'INVITED' | 'ACTIVE' | 'BLOCKED' | 'ARCHIVED' | 'DELETION_PENDING' | 'ANONYMIZED'
    }
  }>
}

export function PlatformOrganizationUsers({ organization, returnTo }: { organization: OrganizationUsers; returnTo: string }) {
  const hasActiveOwner = organization.memberships.some((membership) =>
    membership.role === 'OWNER' && membership.status === 'ACTIVE' && membership.user.status === 'ACTIVE',
  )
  const ownerCandidates = organization.memberships.filter((membership) =>
    membership.status === 'ACTIVE' && membership.user.status === 'ACTIVE' && membership.role !== 'OWNER',
  )

  return (
    <>
      {organization.status === 'ACTIVE' && !hasActiveOwner ? (
        <form action={addPlatformOrganizationOwnerAction} className="mb-5 grid gap-3 rounded-card border border-warning-border bg-warning-subtle p-4 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(14rem,1fr)_auto] sm:items-end">
          <input type="hidden" name="organizationId" value={organization.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="grid gap-1 text-sm font-semibold">Nieuwe actieve eigenaar
            <select className="min-h-10 rounded-control border border-border bg-surface px-3" name="successorUserId" required>
              <option value="">Kies een gebruiker</option>
              {ownerCandidates.map((membership) => (
                <option key={membership.id} value={membership.user.id}>{membership.user.displayName ?? membership.user.email}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Reden<input className="min-h-10 rounded-control border border-border bg-surface px-3" name="reasonNote" minLength={5} maxLength={500} required /></label>
          <button className="min-h-10 rounded-control bg-brand-primary px-4 text-sm font-semibold text-white" type="submit">Eigenaar aanwijzen</button>
        </form>
      ) : null}
      <AdminSection title="Gebruikers" description="Memberships en accountstatus binnen deze organisatie.">
        <AdminTable headers={['Gebruiker', 'Rol', 'Membership', 'Account', 'Beheeractie']}>
          {organization.memberships.map((membership) => <tr key={membership.id}>
            <td className="px-4 py-3"><span className="block font-semibold">{membership.user.displayName ?? 'Naam niet ingevuld'}</span><span className="break-all text-xs text-text-secondary">{membership.user.email}</span></td>
            <td className="px-4 py-3">{organizationRoleLabels[membership.role]}</td>
            <td className="px-4 py-3">{membershipStatusLabels[membership.status]}</td>
            <td className="px-4 py-3">{userStatusLabels[membership.user.status]}</td>
            <td className="px-4 py-3">{membership.user.status === 'ACTIVE' || membership.user.status === 'BLOCKED' ? (
              <form action={changePlatformUserStatusAction} className="flex min-w-72 gap-2">
                <input type="hidden" name="organizationId" value={organization.id} />
                <input type="hidden" name="subjectUserId" value={membership.user.id} />
                <input type="hidden" name="operation" value={membership.user.status === 'ACTIVE' ? 'block' : 'unblock'} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input aria-label="Reden accountactie" className="min-h-9 min-w-0 rounded-control border border-border px-2 text-xs" name="reasonNote" required minLength={5} maxLength={500} />
                <button className="min-h-9 rounded-control border border-border px-2 text-xs font-semibold" type="submit">{membership.user.status === 'ACTIVE' ? 'Blokkeren' : 'Deblokkeren'}</button>
              </form>
            ) : 'Niet beschikbaar'}</td>
          </tr>)}
        </AdminTable>
      </AdminSection>
    </>
  )
}
