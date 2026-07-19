import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicOverviewGrid } from '@/components/public/public-overview-grid'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentPathways } from '@/components/public/public-content-pathways'
import { serviceOverview } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Arbo- en veiligheidsdiensten | WorkMatchr', description: 'Oriënteer u op diensten voor gezond en veilig werken.', alternates: { canonical: '/diensten' }, openGraph: { title: 'Arbo- en veiligheidsdiensten | WorkMatchr', description: 'Oriënteer u op diensten voor gezond en veilig werken.', url: '/diensten' } }

export default function ServicesPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Diensten' }]} eyebrow="Diensten" title="Welke ondersteuning past bij uw vraag?" description="Bekijk veelvoorkomende arbo- en veiligheidsdiensten. Begin bij uw situatie; u hoeft vooraf nog geen specialist te kiezen."><Section spacing="compact"><PublicOverviewGrid items={serviceOverview} /></Section><PublicContentPathways contentId="overview:services" /></PublicPageLayout>
}
