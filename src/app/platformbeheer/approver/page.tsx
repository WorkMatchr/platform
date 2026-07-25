import { PlatformRoleWorkload } from '@/components/platform-admin/platform-role-workload'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformRoleWorkload } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformApproverPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/approver')
  const data = await getPlatformRoleWorkload(administrator.id)
  return <PlatformRoleWorkload title="Approver" permission="APPROVER" permissions={data.permissions} data={data} />
}
