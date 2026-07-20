import type { Metadata } from 'next'
import { MarketplaceDashboard } from '@/components/marketplace/marketplace-dashboard'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { getMarketplaceDashboard, getMarketplacePlatformDashboard } from '@/lib/marketplace/dashboard-query-service'
import { getActiveOrganizationContext } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Dashboard | WorkMatchr' }

export default async function DashboardPage() {
  const { user, activeMembership } = await getActiveOrganizationContext('/dashboard')
  const dashboard = activeMembership
    ? await getMarketplaceDashboard(user.id, activeMembership.organization.id)
    : await getMarketplacePlatformDashboard(user.id)
  const contextLabel = activeMembership ? ` bij ${activeMembership.organization.name}` : ' binnen WorkMatchr-beheer'
  return <Section spacing="compact"><Heading as="h1" size="h2">Dashboard</Heading><p className="mt-3 mb-8 text-text-secondary">Uw actuele acties en marktprocessen{contextLabel}.</p><MarketplaceDashboard dashboard={dashboard} /></Section>
}
