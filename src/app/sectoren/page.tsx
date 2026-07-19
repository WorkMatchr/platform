import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicOverviewGrid } from '@/components/public/public-overview-grid'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { KnowledgeCallToAction } from '@/components/public/knowledge-call-to-action'
import { sectorOverview } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Sectoren en arbeidsrisico’s | WorkMatchr', description: 'Oriënteer u op arbo- en veiligheidsvragen per sector.', alternates: { canonical: '/sectoren' }, openGraph: { title: 'Sectoren en arbeidsrisico’s | WorkMatchr', description: 'Oriënteer u op arbo- en veiligheidsvragen per sector.', url: '/sectoren' } }

export default function SectorsPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Sectoren' }]} eyebrow="Sectoren" title="Aandachtspunten verschillen per werkomgeving" description="Iedere sector kent eigen werkzaamheden en risico’s. De sectorinformatie wordt zorgvuldig opgebouwd; onderstaande ingangen laten zien welke onderwerpen volgen."><Section spacing="compact"><PublicOverviewGrid items={sectorOverview} /></Section><Section spacing="compact" className="bg-surface-subtle"><KnowledgeCallToAction content={{ title: 'Uw situatie is altijd specifiek', description: 'Breng uw werkzaamheden en aandachtspunten in kaart, ook wanneer sectorinformatie nog wordt voorbereid.', primary: { label: 'Verduidelijk uw vraag', href: '/advieswijzer' } }} /></Section></PublicPageLayout>
}
