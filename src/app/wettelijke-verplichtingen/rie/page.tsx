import type { Metadata } from 'next'
import { KnowledgeDocumentPage } from '@/components/public/knowledge-document-page'
import { rieLegalPage } from '@/content/knowledge/rie'

export const metadata: Metadata = { title: 'RI&E als wettelijke verplichting | WorkMatchr', description: rieLegalPage.summary, alternates: { canonical: '/wettelijke-verplichtingen/rie' }, openGraph: { title: 'RI&E als wettelijke verplichting | WorkMatchr', description: rieLegalPage.summary, url: '/wettelijke-verplichtingen/rie' } }
export default function RieLegalRoute() { return <KnowledgeDocumentPage document={rieLegalPage} breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Wettelijke verplichtingen', href: '/wettelijke-verplichtingen' }, { label: 'RI&E' }]} /> }
