import type { Metadata } from 'next'
import { KnowledgeArticlePage } from '@/components/public/knowledge-article-page'
import { getKnowledgeArticleBySlug } from '@/content/knowledge/articles'
import { createPublicContentMetadata } from '@/content/public-metadata'

const content = getKnowledgeArticleBySlug('moet-ik-een-rie-hebben')!
export const metadata: Metadata = createPublicContentMetadata(content)
export default function RieQuestionPage() { return <KnowledgeArticlePage content={content} /> }
