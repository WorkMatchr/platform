import type { Metadata } from 'next'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { LinkButton } from '@/components/ui/link-button'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentPathways } from '@/components/public/public-content-pathways'
import { ServiceOverviewList } from '@/components/public/service-overview-list'
import { expertiseOverview, serviceOverview } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Diensten en deskundigen | WorkMatchr', description: 'Verken arbo- en veiligheidsdiensten en deskundigheden voor gezond en veilig werken.', alternates: { canonical: '/diensten' }, openGraph: { title: 'Diensten en deskundigen | WorkMatchr', description: 'Verken arbo- en veiligheidsdiensten en deskundigheden voor gezond en veilig werken.', url: '/diensten' } }

export default function ServicesPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Diensten' }]} eyebrow="Diensten" title="Welke ondersteuning past bij uw vraag?" description="Verken diensten en deskundigheden voor gezond en veilig werken. Begin bij uw situatie; u hoeft vooraf nog geen specialist te kiezen."><Section spacing="compact"><div className="grid gap-10"><section aria-labelledby="service-questions-title" className="grid gap-4"><h2 id="service-questions-title" className="text-2xl font-bold text-brand-dark">Diensten en vraagstukken</h2><ServiceOverviewList items={serviceOverview} /></section><section aria-labelledby="service-experts-title" className="grid gap-4"><h2 id="service-experts-title" className="text-2xl font-bold text-brand-dark">Deskundigen en specialisten</h2><ServiceOverviewList items={expertiseOverview} /></section></div></Section><Section spacing="compact" className="bg-surface" aria-labelledby="elearning-title">
        <Heading as="h2" size="h2" id="elearning-title">E-learning &amp; opleidingen</Heading>
        <Text className="mt-4 max-w-3xl text-text-secondary">WorkMatchr ontwikkelt praktische online opleidingen op het gebied van arbeidsveiligheid, arbo en gezond werken. Het aanbod is nog niet beschikbaar. We werken aan de volgende mogelijkheden:</Text>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-text-secondary">
          <li>Online en zelfstandig te volgen, in uw eigen tempo.</li>
          <li>Praktijkgerichte inhoud en oefeningen.</li>
          <li>Uw persoonlijke voortgang bewaren binnen WorkMatchr.</li>
          <li>Gericht op individuele deelnemers en leren binnen organisaties.</li>
        </ul>
        <LinkButton href="/e-learning" className="mt-6">Bekijk e-learning &amp; opleidingen</LinkButton>
      </Section><PublicContentPathways contentId="overview:services" /></PublicPageLayout>
}
