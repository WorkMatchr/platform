import type { Metadata } from 'next'
import { KnowledgeDocumentPage } from '@/components/public/knowledge-document-page'
import { rieServicePage } from '@/content/knowledge/rie'

export const metadata: Metadata = { title: 'Ondersteuning bij uw RI&E | WorkMatchr', description: rieServicePage.summary, alternates: { canonical: '/diensten/rie' }, openGraph: { title: 'Ondersteuning bij uw RI&E | WorkMatchr', description: rieServicePage.summary, url: '/diensten/rie' } }
export default function RieServiceRoute() { return <KnowledgeDocumentPage document={rieServicePage} breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Diensten', href: '/diensten' }, { label: 'RI&E' }]} /> }
