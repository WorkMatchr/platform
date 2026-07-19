import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicOverviewGrid } from '@/components/public/public-overview-grid'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicStatusNotice } from '@/components/public/public-status-notice'
import { legalOverview } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Wettelijke arboverplichtingen | WorkMatchr', description: 'Algemene uitleg over veelvoorkomende wettelijke arboverplichtingen.', alternates: { canonical: '/wettelijke-verplichtingen' }, openGraph: { title: 'Wettelijke arboverplichtingen | WorkMatchr', description: 'Algemene uitleg over veelvoorkomende wettelijke arboverplichtingen.', url: '/wettelijke-verplichtingen' } }

export default function LegalObligationsPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Wettelijke verplichtingen' }]} eyebrow="Wettelijke verplichtingen" title="Wat moet uw organisatie regelen?" description="Verken veelvoorkomende verplichtingen voor gezond en veilig werken. Welke regels precies gelden, hangt af van uw organisatie en werkzaamheden."><Section spacing="compact" containerClassName="space-y-8"><PublicStatusNotice title="Algemene informatie, geen individueel advies" description="Gebruik deze informatie om gerichte vragen te stellen. Laat uw concrete situatie beoordelen wanneer toepassing of uitzonderingen niet duidelijk zijn." /><PublicOverviewGrid items={legalOverview} /></Section></PublicPageLayout>
}
