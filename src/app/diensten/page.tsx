import type { Metadata } from 'next'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { LinkButton } from '@/components/ui/link-button'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentPathways } from '@/components/public/public-content-pathways'
import { ServiceOverviewList } from '@/components/public/service-overview-list'
import { publicRoutes } from '@/content/public-routes'
import { expertiseOverview, serviceOverview } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Diensten en deskundigen | WorkMatchr', description: 'Verken arbo- en veiligheidsdiensten en deskundigheden voor gezond en veilig werken.', alternates: { canonical: '/diensten' }, openGraph: { title: 'Diensten en deskundigen | WorkMatchr', description: 'Verken arbo- en veiligheidsdiensten en deskundigheden voor gezond en veilig werken.', url: '/diensten' } }

export default function ServicesPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Diensten' }]} eyebrow="Diensten" title="Welke ondersteuning past bij uw vraag?" description="Bekijk waarvoor u via WorkMatchr een professional kunt inschakelen. Begin bij uw situatie; u hoeft vooraf nog geen specialist te kiezen."><Section spacing="compact"><div className="grid gap-10"><section aria-labelledby="service-questions-title" className="grid gap-4"><h2 id="service-questions-title" className="text-2xl font-bold text-brand-dark">Diensten en vraagstukken</h2><ServiceOverviewList items={serviceOverview} /></section><section aria-labelledby="service-experts-title" className="grid gap-4"><h2 id="service-experts-title" className="text-2xl font-bold text-brand-dark">Deskundigen en specialisten</h2><ServiceOverviewList items={expertiseOverview} /></section></div></Section><PublicContentPathways contentId="overview:services" /><Section spacing="compact" className="bg-surface" aria-labelledby="elearning-title">
        <Heading as="h2" size="h2" id="elearning-title">Zelf kennis opbouwen?</Heading>
        <Text className="mt-4 max-w-3xl text-text-secondary">Naast het vinden van professionals biedt WorkMatchr ook praktische online Arbo-opleidingen. Het aanbod is binnenkort beschikbaar.</Text>
        <LinkButton href={publicRoutes.elearning} variant="outline" className="mt-6">Bekijk E-learning</LinkButton>
      </Section></PublicPageLayout>
}
