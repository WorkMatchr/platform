import { switchOrganizationAction } from '@/app/organisatie/actions'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'

type OrganizationSwitcherProps = {
  activeOrganizationId: string
  organizations: Array<{ id: string; name: string }>
}

export function OrganizationSwitcher({ activeOrganizationId, organizations }: OrganizationSwitcherProps) {
  if (organizations.length < 2) return null
  return (
    <form action={switchOrganizationAction} className="flex flex-col gap-3 rounded-card border border-border bg-surface-subtle p-4 sm:flex-row sm:items-end">
      <div className="flex-1"><label htmlFor="organizationId" className="font-semibold">Andere organisatie</label><select id="organizationId" name="organizationId" defaultValue={activeOrganizationId} className={fieldClassName}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>
      <Button type="submit" variant="outline">Wisselen</Button>
    </form>
  )
}
