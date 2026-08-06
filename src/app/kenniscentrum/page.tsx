import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { PublicContentCard } from '@/components/public/public-content-card'
import { PublicOverviewGrid } from '@/components/public/public-overview-grid'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentPathways } from '@/components/public/public-content-pathways'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { knowledgeCategories } from '@/content/public-overviews'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Kenniscentrum gezond en veilig werken | WorkMatchr',
  description: 'Betrouwbare uitleg over arbeidsomstandigheden, veiligheid en gezondheid.',
  alternates: { canonical: '/kenniscentrum' },
  openGraph: {
    title: 'Kenniscentrum | WorkMatchr',
    description: 'Betrouwbare uitleg over arbeidsomstandigheden, veiligheid en gezondheid.',
    url: '/kenniscentrum',
  },
}

export default function KnowledgeCenterPage() {
  return (
    <PublicPageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Kenniscentrum' }]}
      eyebrow="Kenniscentrum"
      title="Betrouwbare uitleg begint bij uw vraag"
      description="Vind zorgvuldig onderbouwde informatie en zie duidelijk het verschil tussen uitleg, wettelijke context en dienstverlening."
    >
      <Section spacing="compact" containerClassName="space-y-10">
        <section aria-labelledby="published-title">
          <Heading as="h2" size="h2" id="published-title">Gepubliceerde kennisartikelen</Heading>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {knowledgeArticles.map((article) => (
              <li key={article.id}>
                <PublicContentCard title={article.title} description={article.summary} href={article.href} headingLevel="h3" compact />
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="categories-title">
          <Heading as="h2" size="h2" id="categories-title">Categorieën</Heading>
          <div className="mt-5"><PublicOverviewGrid items={knowledgeCategories} /></div>
        </section>
        <section aria-labelledby="types-title">
          <Heading as="h2" size="h2" id="types-title">Vier soorten informatie</Heading>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <PublicContentCard title="Diensten" description="Bekijk welke professionele ondersteuning bij uw situatie kan passen." href={publicRoutes.services} compact />
            <PublicContentCard title="Wettelijke verplichtingen" description="Lees algemene wettelijke context met herleidbare bronnen." href={publicRoutes.obligations} compact />
            <PublicContentCard title="Sectoren" description="Bekijk aandachtspunten per werkomgeving en soort werkzaamheden." href={publicRoutes.sectors} compact />
            <PublicContentCard title="Kennisartikelen" description="Vind begrijpelijke antwoorden op praktische vragen." href={publicRoutes.knowledge} compact />
          </div>
        </section>
      </Section>
      <PublicContentPathways contentId="overview:knowledge" />
    </PublicPageLayout>
  )
}
