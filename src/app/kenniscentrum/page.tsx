import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { PublicContentCard } from '@/components/public/public-content-card'
import { PublicOverviewGrid } from '@/components/public/public-overview-grid'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentPathways } from '@/components/public/public-content-pathways'
import { KnowledgeSearch } from '@/components/public/knowledge-search'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { knowledgeCategories } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Kenniscentrum gezond en veilig werken | WorkMatchr', description: 'Betrouwbare uitleg over arbeidsomstandigheden, veiligheid en gezondheid.', alternates: { canonical: '/kenniscentrum' }, openGraph: { title: 'Kenniscentrum | WorkMatchr', description: 'Betrouwbare uitleg over arbeidsomstandigheden, veiligheid en gezondheid.', url: '/kenniscentrum' } }

export default function KnowledgeCenterPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Kenniscentrum' }]} eyebrow="Kenniscentrum" title="Betrouwbare uitleg begint bij uw vraag" description="Vind zorgvuldig onderbouwde informatie en zie duidelijk het verschil tussen uitleg, wettelijke context en dienstverlening."><Section spacing="compact" containerClassName="space-y-12"><Suspense fallback={<Text className="text-text-secondary">Zoeken wordt geladen…</Text>}><KnowledgeSearch /></Suspense><section aria-labelledby="published-title"><Heading as="h2" size="h2" id="published-title">Gepubliceerde kennisartikelen</Heading><ul className="mt-6 grid gap-5 md:grid-cols-2">{knowledgeArticles.map((article) => <li key={article.id}><PublicContentCard title={article.title} description={article.summary} href={article.href} linkLabel={`Lees ${article.title}`} status="Kennis · bronnen gecontroleerd" headingLevel="h3" /></li>)}</ul></section><section aria-labelledby="categories-title"><Heading as="h2" size="h2" id="categories-title">Categorieën</Heading><div className="mt-6"><PublicOverviewGrid items={knowledgeCategories} /></div></section><section aria-labelledby="types-title"><Heading as="h2" size="h2" id="types-title">Vier soorten informatie</Heading><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4"><PublicContentCard title="Kennis" description="Een begrijpelijk antwoord op een praktische vraag." /><PublicContentCard title="Wettelijke verplichting" description="Algemene wettelijke context met herleidbare bronnen." /><PublicContentCard title="Dienstverlening" description="Wat deskundige ondersteuning kan inhouden en wanneer die nuttig kan zijn." /><PublicContentCard title="Sectorcontext" description="Aandachtspunten die per werkomgeving en werkzaamheden kunnen verschillen." /></div></section></Section><PublicContentPathways contentId="overview:knowledge" /></PublicPageLayout>
}
