import { PlatformRoleWorkload } from '@/components/platform-admin/platform-role-workload'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformRoleWorkload } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformReviewerPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/reviewer')
  const data = await getPlatformRoleWorkload(administrator.id)
  return <PlatformRoleWorkload title="Reviewer" permission="REVIEWER" permissions={data.permissions} data={data} />
}
