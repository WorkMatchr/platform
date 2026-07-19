import type { Metadata } from 'next'
import { KnowledgeDocumentPage } from '@/components/public/knowledge-document-page'
import { rieQuestionArticle } from '@/content/knowledge/rie'

export const metadata: Metadata = { title: 'Moet ik een RI&E hebben? | WorkMatchr', description: rieQuestionArticle.summary, alternates: { canonical: '/kenniscentrum/moet-ik-een-rie-hebben' }, openGraph: { title: 'Moet ik een RI&E hebben? | WorkMatchr', description: rieQuestionArticle.summary, url: '/kenniscentrum/moet-ik-een-rie-hebben', type: 'article' } }
export default function RieQuestionPage() { return <KnowledgeDocumentPage document={rieQuestionArticle} showShortAnswer breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Kenniscentrum', href: '/kenniscentrum' }, { label: rieQuestionArticle.title }]} /> }
