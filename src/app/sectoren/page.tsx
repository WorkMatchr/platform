import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicOverviewGrid } from '@/components/public/public-overview-grid'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentPathways } from '@/components/public/public-content-pathways'
import { sectorOverview } from '@/content/public-overviews'

export const metadata: Metadata = { title: 'Sectoren en arbeidsrisico’s | WorkMatchr', description: 'Oriënteer u op arbo- en veiligheidsvragen per sector.', alternates: { canonical: '/sectoren' }, openGraph: { title: 'Sectoren en arbeidsrisico’s | WorkMatchr', description: 'Oriënteer u op arbo- en veiligheidsvragen per sector.', url: '/sectoren' } }

export default function SectorsPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Sectoren' }]} eyebrow="Sectoren" title="Aandachtspunten verschillen per werkomgeving" description="Iedere sector kent eigen werkzaamheden en risico’s. De sectorinformatie wordt zorgvuldig opgebouwd; onderstaande ingangen laten zien welke onderwerpen volgen."><Section spacing="compact"><PublicOverviewGrid items={sectorOverview} /></Section><PublicContentPathways contentId="overview:sectors" /></PublicPageLayout>
}
