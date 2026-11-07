import { ProviderCompleteness } from '@/components/providers/provider-completeness'
import { assessProviderDossierCompleteness } from '@/lib/providers/provider-dossier-completeness'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPlatformAdminLanding } from '@/lib/platform-admin/platform-admin-landing'
import type { Metadata } from 'next'
import { MarketplaceDashboard } from '@/components/marketplace/marketplace-dashboard'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { getMarketplaceDashboard, getMarketplacePlatformDashboard } from '@/lib/marketplace/dashboard-query-service'
import { getActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'

export const metadata: Metadata = { title: 'Dashboard | WorkMatchr' }

export default async function DashboardPage() {
  const { user, activeMembership } = await getActiveOrganizationContext('/dashboard')
  const platformLanding = await getPlatformAdminLanding(user.id)
  if (platformLanding) redirect(platformLanding)
  const dashboard = activeMembership
    ? await getMarketplaceDashboard(user.id, activeMembership.organization.id)
    : await getMarketplacePlatformDashboard(user.id).catch((error: unknown) => {
      if (error instanceof MarketplaceServiceError && error.code === 'ACCESS_DENIED') {
        redirect(user.accountType ? '/organisatie/nieuw' : '/account')
      }
      throw error
    })
  const assessment = dashboard.kind === 'PROVIDER'
    ? await assessProviderDossierCompleteness(user.id, dashboard.providerProfileId) : null
  const contextLabel = activeMembership ? ` bij ${activeMembership.organization.name}` : ' binnen WorkMatchr-beheer'
  return <Section spacing="compact"><Heading as="h1" size="h2">Dashboard</Heading><p className="mt-3 mb-8 text-text-secondary">Uw actuele acties en marktprocessen{contextLabel}.</p>{assessment && <div className="mb-8">
    <ProviderCompleteness assessment={assessment} />
    {dashboard.kind === 'PROVIDER' && dashboard.membership.role === 'MEMBER' && <p className="mt-3">Een eigenaar of beheerder kan uw organisatieprofiel bijwerken.</p>}
    <Link href="/aanbiedersdossier" className="mt-4 inline-block font-semibold underline">Profiel en beoordelingsstatus bekijken</Link>
  </div>}<MarketplaceDashboard dashboard={dashboard} /></Section>
}
