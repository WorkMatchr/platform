import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlatformOrganizationUsers } from '@/components/platform-admin/platform-organization-users'
import { AdminPageHeader, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformOrganizationDetail } from '@/lib/platform-admin/platform-admin-query-service'
import { organizationStatusLabels } from '@/lib/presentation/platform-labels'

export default async function PlatformOrganizationUsersPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  const pathname = `/platformbeheer/organisaties/${organizationId}/gebruikers`
  const administrator = await requirePlatformAdministrator(pathname)
  const organization = await getPlatformOrganizationDetail(administrator.id, organizationId)
  if (!organization) notFound()

  return (
    <>
      <AdminPageHeader
        title={`Gebruikers · ${organization.name}`}
        description="Beheer gebruikers en memberships vanuit de organisatiecontext."
        action={<StatusPill tone={organization.status === 'ACTIVE' ? 'good' : 'bad'}>{organizationStatusLabels[organization.status]}</StatusPill>}
      />
      <Link className="mb-4 inline-flex min-h-10 items-center rounded-control text-sm font-semibold text-brand-primary hover:underline" href={`/platformbeheer/organisaties/${organization.id}`}>
        Terug naar organisatie
      </Link>
      <PlatformOrganizationUsers organization={organization} returnTo={pathname} />
    </>
  )
}
